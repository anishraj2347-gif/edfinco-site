// Writer jobs. The AI writing runs in a Claude Code ROUTINE on the owner's Claude Pro plan (no
// API key, no per-token bill). The website "fires" the routine through its API trigger with a
// payload of {jobId, token}; the routine then fetches the job from /api/automation/jobs/<id> and
// submits the article back. The token is random per firing, stored only as a hash, expires after
// 3 hours, and only authorises that ONE job — so the routine never holds a long-lived secret.
import fs from "node:fs";
import path from "node:path";
import type { Db } from "./db";
import { config, writerConfigured } from "./config";
import { hashToken, newToken, safeEqual, TOKEN_RE, uuid, UUID_RE } from "./crypto";

export type JobKind = "write" | "revise";
export type JobStatus = "queued" | "fired" | "done" | "failed" | "cancelled";

export interface JobRow {
  id: string;
  post_id: string;
  kind: JobKind;
  status: JobStatus;
  token_hash: string | null;
  token_expires: Date | null;
  attempts: number;
  submissions: number;
  fired_at: Date | null;
  finished_at: Date | null;
  session_url: string | null;
  last_error: string | null;
  created_at: Date;
}

export const MAX_ATTEMPTS = 3;
export const MAX_SUBMISSIONS = 4;
/** A fired job with no result after this long is fired again (new token). */
export const STUCK_AFTER_MIN = 30;

const COLS = `id, post_id, kind, status, token_hash, token_expires, attempts, submissions, fired_at, finished_at,
  session_url, last_error, created_at`;

const one = <T>(rows: T[]): T | null => rows[0] ?? null;

export async function createJob(db: Db, postId: string, kind: JobKind): Promise<JobRow> {
  // Only one open job per post: a newer request supersedes anything still pending.
  await db.query(`UPDATE jobs SET status = 'cancelled' WHERE post_id = $1 AND status IN ('queued', 'fired')`, [postId]);
  const rows = await db.query<JobRow>(
    `INSERT INTO jobs (id, post_id, kind, status) VALUES ($1, $2, $3, 'queued') RETURNING ${COLS}`,
    [uuid(), postId, kind]
  );
  return rows[0];
}

export async function getJob(db: Db, id: string): Promise<JobRow | null> {
  if (!UUID_RE.test(id)) return null;
  return one(await db.query<JobRow>(`SELECT ${COLS} FROM jobs WHERE id = $1`, [id]));
}

export function openJobs(db: Db): Promise<JobRow[]> {
  return db.query<JobRow>(`SELECT ${COLS} FROM jobs WHERE status IN ('queued', 'fired') ORDER BY created_at ASC`);
}

export async function latestJobForPost(db: Db, postId: string): Promise<JobRow | null> {
  return one(
    await db.query<JobRow>(`SELECT ${COLS} FROM jobs WHERE post_id = $1 ORDER BY created_at DESC LIMIT 1`, [postId])
  );
}

/**
 * Hands the job to the writer. Returns ok=false (job stays queued for the next scheduler tick)
 * if the writer isn't connected yet or the trigger call fails.
 */
export async function fireJob(db: Db, job: JobRow): Promise<{ ok: boolean; error?: string }> {
  if (job.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many attempts." };
  const devMode = !writerConfigured() && !config.isProd;
  if (!writerConfigured() && !devMode) {
    await db.query(`UPDATE jobs SET last_error = $2 WHERE id = $1`, [job.id, "Writer not connected yet."]);
    return { ok: false, error: "Writer not connected yet." };
  }

  const token = newToken();
  const claimed = await db.query(
    `UPDATE jobs SET status = 'fired', token_hash = $2, token_expires = now() + interval '3 hours',
       attempts = attempts + 1, fired_at = now(), last_error = NULL
     WHERE id = $1 AND status IN ('queued', 'fired') RETURNING id`,
    [job.id, hashToken(token)]
  );
  if (!claimed.length) return { ok: false, error: "Job is no longer open." };

  const payload = JSON.stringify({ jobId: job.id, token, kind: job.kind });

  if (devMode) {
    // Local development: no routine — write the payload where scripts/dev-worker.mjs picks it up.
    const dir = path.join(process.cwd(), ".data", "dev-fires");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${Date.now()}-${job.id}.json`), payload, { mode: 0o600 });
    console.info(`[writer:dev] job ${job.kind} ${job.id} queued for scripts/dev-worker.mjs`);
    return { ok: true };
  }

  try {
    const res = await fetch(config.routineFireUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.routineFireToken}`,
        "anthropic-beta": "experimental-cc-routine-2026-04-01",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: payload }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      throw new Error(`Routine trigger returned HTTP ${res.status} ${detail}`);
    }
    const data = (await res.json().catch(() => ({}))) as { claude_code_session_url?: unknown };
    const sessionUrl =
      typeof data.claude_code_session_url === "string" && data.claude_code_session_url.startsWith("https://claude.ai/")
        ? data.claude_code_session_url
        : null;
    await db.query(`UPDATE jobs SET session_url = $2 WHERE id = $1`, [job.id, sessionUrl]);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Back to queued so the next tick retries (attempts already counted).
    await db.query(`UPDATE jobs SET status = 'queued', token_hash = NULL, last_error = $2 WHERE id = $1`, [
      job.id,
      message.slice(0, 500),
    ]);
    return { ok: false, error: message };
  }
}

/** Authenticates a writer request: job must be fired, unexpired, and the token must match. */
export async function authJob(db: Db, id: string, token: string | null): Promise<JobRow | null> {
  if (!token || !TOKEN_RE.test(token) || !UUID_RE.test(id)) return null;
  const job = await getJob(db, id);
  if (!job || job.status !== "fired" || !job.token_hash || !job.token_expires) return null;
  if (job.token_expires.getTime() <= Date.now()) return null;
  return safeEqual(hashToken(token), job.token_hash) ? job : null;
}

export async function countSubmission(db: Db, id: string): Promise<number> {
  const rows = await db.query<{ submissions: number }>(
    `UPDATE jobs SET submissions = submissions + 1 WHERE id = $1 RETURNING submissions`,
    [id]
  );
  return rows[0]?.submissions ?? MAX_SUBMISSIONS + 1;
}

export async function finishJob(db: Db, id: string): Promise<void> {
  await db.query(`UPDATE jobs SET status = 'done', finished_at = now(), token_hash = NULL WHERE id = $1`, [id]);
}

export async function failJob(db: Db, id: string, reason: string): Promise<void> {
  await db.query(
    `UPDATE jobs SET status = 'failed', finished_at = now(), token_hash = NULL, last_error = $2 WHERE id = $1`,
    [id, reason.slice(0, 1000)]
  );
}
