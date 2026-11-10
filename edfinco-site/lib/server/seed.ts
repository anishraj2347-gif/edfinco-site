// One-time import of the starter content on a fresh database:
//  - content/blog/<slug>.md  → live posts (the three launch articles)
//  - content/blog/TOPICS.md  → the topic backlog the writer works through
// Idempotent (ON CONFLICT DO NOTHING) and guarded by a meta flag, so it only does work once.
import fs from "node:fs";
import path from "node:path";
import type { Db } from "./db";
import { parseFrontmatter } from "@/lib/markdown";
import { uuid } from "./crypto";

const SEED_DIR = path.join(process.cwd(), "content", "blog");
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SEED_FLAG = "seeded_v1";

// Topics the writer must not take until the owner confirms the facts (see brand/brand.md).
const BLOCKED_TOPIC_RE = /processing fees/i;

export async function seedIfNeeded(db: Db): Promise<void> {
  const done = await db.query(`SELECT 1 FROM meta WHERE key = $1`, [SEED_FLAG]);
  if (done.length) return;

  if (fs.existsSync(SEED_DIR)) {
    const files = fs
      .readdirSync(SEED_DIR)
      .filter((f) => f.endsWith(".md") && SLUG_RE.test(f.slice(0, -3)))
      .sort();
    for (const [i, file] of files.entries()) {
      const slug = file.slice(0, -3);
      const { data, body } = parseFrontmatter(fs.readFileSync(path.join(SEED_DIR, file), "utf8"));
      const str = (k: string) => (typeof data[k] === "string" ? (data[k] as string) : "");
      const date = str("date");
      if (!str("title") || !/^\d{4}-\d{2}-\d{2}$/.test(date) || str("status") !== "published") continue;
      // 7:00 am IST on the post's date; a minute apart so same-day posts keep a stable order.
      const publishAt = new Date(Date.parse(`${date}T07:00:00+05:30`) - i * 60_000).toISOString();
      const tags = Array.isArray(data.tags) ? data.tags.filter((t) => typeof t === "string") : [];
      const sources = Array.isArray(data.sources) ? data.sources.filter((t) => typeof t === "string") : [];
      const id = uuid();
      const inserted = await db.query(
        `INSERT INTO posts (id, slug, status, origin, publish_at, title, description, tags, image, image_alt,
                            body, sources, version, approved_at, approved_by, published_notified_at)
         VALUES ($1, $2, 'approved', 'seed', $3::timestamptz, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb, 1,
                 $3::timestamptz, 'starter content', now())
         ON CONFLICT (slug) DO NOTHING
         RETURNING id`,
        [
          id,
          slug,
          publishAt,
          str("title"),
          str("description"),
          JSON.stringify(tags),
          str("image") || null,
          str("imageAlt") || null,
          body.trim(),
          JSON.stringify(sources),
        ]
      );
      if (inserted.length) {
        await db.query(
          `INSERT INTO post_versions (post_id, version, title, description, tags, body, sources)
           VALUES ($1, 1, $2, $3, $4::jsonb, $5, $6::jsonb) ON CONFLICT DO NOTHING`,
          [id, str("title"), str("description"), JSON.stringify(tags), body.trim(), JSON.stringify(sources)]
        );
      }
    }

    const topicsFile = path.join(SEED_DIR, "TOPICS.md");
    if (fs.existsSync(topicsFile)) {
      const lines = fs.readFileSync(topicsFile, "utf8").split(/\r?\n/);
      let position = 0;
      for (const line of lines) {
        const m = line.match(/^- \[( |x)\]\s+(.+?)\s*$/i);
        if (!m) continue;
        const title = m[2].slice(0, 500);
        const status = m[1].toLowerCase() === "x" ? "used" : BLOCKED_TOPIC_RE.test(title) ? "blocked" : "open";
        await db.query(
          `INSERT INTO topics (title, status, position) VALUES ($1, $2, $3) ON CONFLICT (title) DO NOTHING`,
          [title, status, position++]
        );
      }
    }
  }

  await db.query(`INSERT INTO meta (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`, [
    SEED_FLAG,
    new Date().toISOString(),
  ]);
}
