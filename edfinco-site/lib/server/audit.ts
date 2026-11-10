// Append-only activity log: every admin action, review-link action, writer submission and
// scheduler decision is recorded with who did it. Shown on the dashboard ("Recent activity").
import type { Db } from "./db";

export interface AuditRow {
  id: number;
  at: Date;
  actor: string;
  action: string;
  post_id: string | null;
  details: Record<string, unknown> | null;
}

export async function audit(
  db: Db,
  actor: string,
  action: string,
  postId: string | null = null,
  details: Record<string, unknown> | null = null
): Promise<void> {
  try {
    await db.query(`INSERT INTO audit_log (actor, action, post_id, details) VALUES ($1, $2, $3, $4::jsonb)`, [
      actor.slice(0, 200),
      action.slice(0, 100),
      postId,
      details ? JSON.stringify(details).slice(0, 4000) : null,
    ]);
  } catch (err) {
    console.error("[audit] failed to write", action, err);
  }
}

export async function recentAudit(db: Db, limit = 20): Promise<AuditRow[]> {
  return db.query<AuditRow>(
    `SELECT id, at, actor, action, post_id, details FROM audit_log ORDER BY id DESC LIMIT $1`,
    [limit]
  );
}
