// Fixed-window rate limiting backed by the database (works across serverless instances).
import type { Db } from "./db";

/** Counts one hit for `key`; returns true while the key is within `limit` hits per `windowSec`. */
export async function allow(db: Db, key: string, limit: number, windowSec: number): Promise<boolean> {
  const rows = await db.query<{ count: number }>(
    `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, now(), 1)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.window_start < now() - ($2::int * interval '1 second')
                    THEN 1 ELSE rate_limits.count + 1 END,
       window_start = CASE WHEN rate_limits.window_start < now() - ($2::int * interval '1 second')
                    THEN now() ELSE rate_limits.window_start END
     RETURNING count`,
    [key.slice(0, 200), windowSec]
  );
  return (rows[0]?.count ?? 1) <= limit;
}
