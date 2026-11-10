// The editorial backlog the writer works through (seeded from content/blog/TOPICS.md).
import type { Db } from "./db";

export interface TopicRow {
  id: number;
  title: string;
  status: "open" | "used" | "skipped" | "blocked";
  position: number;
}

export async function nextTopic(db: Db): Promise<TopicRow | null> {
  const rows = await db.query<TopicRow>(
    `SELECT id, title, status, position FROM topics WHERE status = 'open' ORDER BY position ASC, id ASC LIMIT 1`
  );
  return rows[0] ?? null;
}

export async function markTopicUsed(db: Db, id: number, postId: string): Promise<void> {
  await db.query(`UPDATE topics SET status = 'used', post_id = $2 WHERE id = $1`, [id, postId]);
}

export async function upcomingTopics(db: Db, limit = 8): Promise<TopicRow[]> {
  return db.query<TopicRow>(
    `SELECT id, title, status, position FROM topics WHERE status = 'open' ORDER BY position ASC, id ASC LIMIT $1`,
    [limit]
  );
}

export async function openTopicCount(db: Db): Promise<number> {
  const rows = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM topics WHERE status = 'open'`);
  return rows[0]?.n ?? 0;
}

/** Appends topics to the end of the backlog (duplicates ignored). Returns how many were added. */
export async function addTopics(db: Db, titles: string[]): Promise<number> {
  const rows = await db.query<{ p: number }>(`SELECT COALESCE(max(position), 0)::int AS p FROM topics`);
  let position = (rows[0]?.p ?? 0) + 1;
  let added = 0;
  for (const raw of titles) {
    const title = raw.trim().slice(0, 300);
    if (title.length < 8 || /processing fee/i.test(title)) continue;
    const r = await db.query(
      `INSERT INTO topics (title, status, position) VALUES ($1, 'open', $2) ON CONFLICT (title) DO NOTHING RETURNING id`,
      [title, position++]
    );
    added += r.length;
  }
  return added;
}

export async function skipTopic(db: Db, id: number): Promise<void> {
  await db.query(`UPDATE topics SET status = 'skipped' WHERE id = $1 AND status = 'open'`, [id]);
}
