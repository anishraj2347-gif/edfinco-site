// Blog post storage + the approval state machine. Every state change is a single conditional
// UPDATE (e.g. "approve only if this exact version is still pending review"), so double-clicks,
// stale email links and concurrent instances can never approve the wrong version.
import type { Db } from "./db";
import { hashToken, newToken, TOKEN_RE, uuid, UUID_RE } from "./crypto";
import type { Checks, Submission } from "./post-checks";

export type PostStatus = "writing" | "pending_review" | "revising" | "approved" | "failed" | "rejected";

export interface PostRow {
  id: string;
  slug: string | null;
  status: PostStatus;
  origin: string;
  slot_at: Date | null;
  publish_at: Date | null;
  topic: string | null;
  title: string;
  description: string;
  tags: string[];
  image: string | null;
  image_alt: string | null;
  body: string;
  sources: string[];
  version: number;
  checks: Checks | null;
  feedback: string | null;
  reminder_sent_at: Date | null;
  published_notified_at: Date | null;
  approved_at: Date | null;
  approved_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface VersionRow {
  version: number;
  title: string;
  feedback: string | null;
  checks: Checks | null;
  created_at: Date;
}

const COLS = `id, slug, status, origin, slot_at, publish_at, topic, title, description, tags, image, image_alt,
  body, sources, version, checks, feedback, reminder_sent_at, published_notified_at, approved_at, approved_by,
  created_at, updated_at`;

const OPEN_WORK = `('writing', 'pending_review', 'revising', 'failed')`;

export const STATUS_LABEL: Record<PostStatus, string> = {
  writing: "Being written",
  pending_review: "Waiting for approval",
  revising: "Being revised",
  approved: "Approved",
  failed: "Writer problem",
  rejected: "Rejected",
};

export function isLive(p: PostRow, now: Date = new Date()): boolean {
  return p.status === "approved" && !!p.publish_at && p.publish_at.getTime() <= now.getTime();
}

const one = <T>(rows: T[]): T | null => rows[0] ?? null;

// ---------- Public reads ----------

export function listLive(db: Db): Promise<PostRow[]> {
  return db.query<PostRow>(
    `SELECT ${COLS} FROM posts WHERE status = 'approved' AND publish_at <= now()
     ORDER BY publish_at DESC, slug ASC`
  );
}

export async function getLiveBySlug(db: Db, slug: string): Promise<PostRow | null> {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 90) return null;
  return one(
    await db.query<PostRow>(
      `SELECT ${COLS} FROM posts WHERE slug = $1 AND status = 'approved' AND publish_at <= now()`,
      [slug]
    )
  );
}

// ---------- Admin reads ----------

export async function getPostById(db: Db, id: string): Promise<PostRow | null> {
  if (!UUID_RE.test(id)) return null;
  return one(await db.query<PostRow>(`SELECT ${COLS} FROM posts WHERE id = $1`, [id]));
}

export function listAdminPosts(db: Db, limit = 60): Promise<PostRow[]> {
  return db.query<PostRow>(
    `SELECT ${COLS} FROM posts ORDER BY COALESCE(slot_at, publish_at, created_at) DESC LIMIT $1`,
    [limit]
  );
}

/** Unfinished work plus approved posts that haven't gone live yet, soonest first. */
export function pipeline(db: Db): Promise<PostRow[]> {
  return db.query<PostRow>(
    `SELECT ${COLS} FROM posts
     WHERE status IN ${OPEN_WORK} OR (status = 'approved' AND publish_at > now())
     ORDER BY slot_at ASC NULLS LAST, created_at ASC`
  );
}

export async function hasOpenWork(db: Db): Promise<boolean> {
  return (await db.query(`SELECT 1 FROM posts WHERE status IN ${OPEN_WORK} LIMIT 1`)).length > 0;
}

export async function slotTaken(db: Db, slot: Date): Promise<boolean> {
  return (await db.query(`SELECT 1 FROM posts WHERE slot_at = $1::timestamptz`, [slot.toISOString()])).length > 0;
}

export async function recentImages(db: Db, n = 3): Promise<string[]> {
  // Rejected drafts count too: a replacement for a rejected draft must not reuse its photo.
  // Ordered by when the draft was made, so the newest drafts' photos are avoided first.
  const rows = await db.query<{ image: string }>(
    `SELECT image FROM posts WHERE image IS NOT NULL
     ORDER BY created_at DESC LIMIT $1`,
    [n]
  );
  return rows.map((r) => r.image);
}

export async function existingTitles(db: Db): Promise<string[]> {
  const rows = await db.query<{ title: string }>(
    `SELECT title FROM posts WHERE title <> '' AND status <> 'rejected' ORDER BY created_at DESC LIMIT 200`
  );
  return rows.map((r) => r.title);
}

export function versionsOf(db: Db, id: string): Promise<VersionRow[]> {
  return db.query<VersionRow>(
    `SELECT version, title, feedback, checks, created_at FROM post_versions WHERE post_id = $1 ORDER BY version DESC`,
    [id]
  );
}

// ---------- Writes ----------

export async function createPostForSlot(
  db: Db,
  input: { slot: Date; topic: string | null; image: { src: string; alt: string } }
): Promise<PostRow | null> {
  return one(
    await db.query<PostRow>(
      `INSERT INTO posts (id, status, origin, slot_at, topic, image, image_alt)
       VALUES ($1, 'writing', 'automation', $2::timestamptz, $3, $4, $5)
       ON CONFLICT (slot_at) WHERE slot_at IS NOT NULL DO NOTHING
       RETURNING ${COLS}`,
      [uuid(), input.slot.toISOString(), input.topic, input.image.src, input.image.alt]
    )
  );
}

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/₹/g, " rupee ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (base.length <= 70) return base || "post";
  return base.slice(0, 70).replace(/-[^-]*$/, "") || base.slice(0, 70);
}

async function uniqueSlug(db: Db, title: string, postId: string): Promise<string> {
  const base = slugify(title);
  for (let n = 1; n <= 50; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const taken = await db.query(`SELECT 1 FROM posts WHERE slug = $1 AND id <> $2`, [candidate, postId]);
    if (!taken.length) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * Stores a new version from the writer and puts the post back in front of the admin.
 * Only valid while the post is 'writing' or 'revising'.
 */
export async function saveVersion(
  db: Db,
  post: PostRow,
  sub: Submission,
  checks: Checks
): Promise<PostRow | null> {
  const slug = await uniqueSlug(db, sub.title, post.id);
  const updated = one(
    await db.query<PostRow>(
      `UPDATE posts SET
         status = 'pending_review', version = version + 1, slug = $2, title = $3, description = $4,
         tags = $5::jsonb, body = $6, sources = $7::jsonb, checks = $8::jsonb,
         reminder_sent_at = NULL, updated_at = now()
       WHERE id = $1 AND status IN ('writing', 'revising')
       RETURNING ${COLS}`,
      [
        post.id,
        slug,
        sub.title,
        sub.description,
        JSON.stringify(sub.tags),
        sub.body,
        JSON.stringify(sub.sources),
        JSON.stringify(checks),
      ]
    )
  );
  if (!updated) return null;
  await db.query(
    `INSERT INTO post_versions (post_id, version, title, description, tags, body, sources, feedback, checks)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7::jsonb, $8, $9::jsonb)
     ON CONFLICT (post_id, version) DO NOTHING`,
    [
      updated.id,
      updated.version,
      sub.title,
      sub.description,
      JSON.stringify(sub.tags),
      sub.body,
      JSON.stringify(sub.sources),
      post.status === "revising" ? post.feedback : null,
      JSON.stringify(checks),
    ]
  );
  return updated;
}

/**
 * A link for approval emails, bound to the post's CURRENT version. Valid 7 days. Actions through it
 * need that exact version to still be pending review; afterwards it only shows the outcome.
 */
export async function createReviewToken(db: Db, post: PostRow): Promise<string> {
  const token = newToken();
  await db.query(`DELETE FROM review_tokens WHERE expires_at < now()`);
  await db.query(
    `INSERT INTO review_tokens (token_hash, post_id, version, expires_at)
     VALUES ($1, $2, $3, now() + interval '7 days')`,
    [hashToken(token), post.id, post.version]
  );
  return token;
}

export async function lookupReviewToken(
  db: Db,
  token: string
): Promise<{ post: PostRow; tokenVersion: number } | null> {
  if (!TOKEN_RE.test(token)) return null;
  const row = one(
    await db.query<{ post_id: string; version: number }>(
      `SELECT post_id, version FROM review_tokens WHERE token_hash = $1 AND expires_at > now()`,
      [hashToken(token)]
    )
  );
  if (!row) return null;
  const post = await getPostById(db, row.post_id);
  return post ? { post, tokenVersion: row.version } : null;
}

export async function approve(db: Db, id: string, version: number, actor: string): Promise<PostRow | null> {
  const p = one(
    await db.query<PostRow>(
      `UPDATE posts SET status = 'approved',
         publish_at = CASE WHEN slot_at IS NOT NULL AND slot_at > now() THEN slot_at ELSE now() END,
         approved_at = now(), approved_by = $3, feedback = NULL, updated_at = now()
       WHERE id = $1 AND status = 'pending_review' AND version = $2
       RETURNING ${COLS}`,
      [id, version, actor.slice(0, 200)]
    )
  );
  return p;
}

export async function publishNow(db: Db, id: string, actor: string): Promise<PostRow | null> {
  const p = one(
    await db.query<PostRow>(
      `UPDATE posts SET status = 'approved', publish_at = now(),
         approved_at = COALESCE(approved_at, now()), approved_by = COALESCE(approved_by, $2),
         feedback = NULL, updated_at = now()
       WHERE id = $1 AND version >= 1
         AND (status = 'pending_review' OR (status = 'approved' AND publish_at > now()))
       RETURNING ${COLS}`,
      [id, actor.slice(0, 200)]
    )
  );
  return p;
}

export async function startRevision(db: Db, id: string, version: number, feedback: string): Promise<PostRow | null> {
  const p = one(
    await db.query<PostRow>(
      `UPDATE posts SET status = 'revising', feedback = $3, updated_at = now()
       WHERE id = $1 AND status = 'pending_review' AND version = $2
       RETURNING ${COLS}`,
      [id, version, feedback]
    )
  );
  return p;
}

/**
 * Reject a post. 'skip' keeps it on its slot (nothing is published that day); 'replace' frees the
 * slot so the scheduler writes a different post for it.
 */
export async function reject(db: Db, id: string, mode: "skip" | "replace"): Promise<PostRow | null> {
  const p = one(
    await db.query<PostRow>(
      `UPDATE posts SET status = 'rejected',
         slot_at = CASE WHEN $2 = 'replace' THEN NULL ELSE slot_at END, updated_at = now()
       WHERE id = $1 AND status <> 'rejected' AND NOT (status = 'approved' AND publish_at <= now())
       RETURNING ${COLS}`,
      [id, mode]
    )
  );
  if (p) {
    await db.query(`UPDATE jobs SET status = 'cancelled' WHERE post_id = $1 AND status IN ('queued', 'fired')`, [id]);
  }
  return p;
}

/** Approved but not live yet → back to waiting for approval. */
export async function withdraw(db: Db, id: string): Promise<PostRow | null> {
  return one(
    await db.query<PostRow>(
      `UPDATE posts SET status = 'pending_review', approved_at = NULL, approved_by = NULL, updated_at = now()
       WHERE id = $1 AND status = 'approved' AND publish_at > now()
       RETURNING ${COLS}`,
      [id]
    )
  );
}

/** Takes a live post off the website. */
export async function unpublish(db: Db, id: string): Promise<PostRow | null> {
  return one(
    await db.query<PostRow>(
      `UPDATE posts SET status = 'rejected', updated_at = now()
       WHERE id = $1 AND status = 'approved' AND publish_at <= now()
       RETURNING ${COLS}`,
      [id]
    )
  );
}

export async function markFailed(db: Db, id: string): Promise<void> {
  await db.query(
    `UPDATE posts SET status = 'failed', updated_at = now() WHERE id = $1 AND status IN ('writing', 'revising')`,
    [id]
  );
}

/** After a failure: back to the state the retried job needs ('writing' for v0, else 'revising'). */
export async function resumeAfterFailure(db: Db, id: string): Promise<PostRow | null> {
  return one(
    await db.query<PostRow>(
      `UPDATE posts SET status = CASE WHEN version = 0 THEN 'writing' ELSE 'revising' END, updated_at = now()
       WHERE id = $1 AND status = 'failed'
       RETURNING ${COLS}`,
      [id]
    )
  );
}

export async function moveToSlot(db: Db, id: string, slot: Date): Promise<boolean> {
  try {
    const rows = await db.query(
      `UPDATE posts SET slot_at = $2::timestamptz, reminder_sent_at = NULL,
         publish_at = CASE WHEN status = 'approved' THEN $2::timestamptz ELSE publish_at END, updated_at = now()
       WHERE id = $1 RETURNING id`,
      [id, slot.toISOString()]
    );
    return rows.length > 0;
  } catch {
    return false; // slot already taken (unique index)
  }
}

export async function setReminderSent(db: Db, id: string): Promise<void> {
  await db.query(`UPDATE posts SET reminder_sent_at = now() WHERE id = $1`, [id]);
}

export async function setPublishedNotified(db: Db, id: string): Promise<void> {
  await db.query(`UPDATE posts SET published_notified_at = now() WHERE id = $1`, [id]);
}

export function dueForPublishedEmail(db: Db): Promise<PostRow[]> {
  return db.query<PostRow>(
    `SELECT ${COLS} FROM posts WHERE status = 'approved' AND publish_at <= now() AND published_notified_at IS NULL
     ORDER BY publish_at ASC LIMIT 10`
  );
}
