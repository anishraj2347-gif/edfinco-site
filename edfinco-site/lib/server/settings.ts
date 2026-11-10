// Automation settings the admin controls from the dashboard.
import type { Db } from "./db";
import { audit } from "./audit";
import { HHMM_RE, nextSlot, slotOnIstDay } from "./schedule";
import { moveToSlot, pipeline } from "./posts";

export interface Settings {
  automationEnabled: boolean;
  publishTime: string; // HH:MM, India time
  reviewLeadHours: number; // approval email goes out this many hours before the post goes live
  lastTickAt: Date | null;
  updatedAt: Date;
  updatedBy: string | null;
}

export const LEAD_MIN = 1;
export const LEAD_MAX = 24;

export async function getSettings(db: Db): Promise<Settings> {
  const rows = await db.query<{
    automation_enabled: boolean;
    publish_time: string;
    review_lead_hours: number;
    last_tick_at: Date | null;
    updated_at: Date;
    updated_by: string | null;
  }>(`SELECT automation_enabled, publish_time, review_lead_hours, last_tick_at, updated_at, updated_by
      FROM settings WHERE id = 1`);
  const r = rows[0];
  return {
    automationEnabled: r.automation_enabled,
    publishTime: r.publish_time,
    reviewLeadHours: r.review_lead_hours,
    lastTickAt: r.last_tick_at,
    updatedAt: r.updated_at,
    updatedBy: r.updated_by,
  };
}

export async function setAutomation(db: Db, enabled: boolean, actor: string): Promise<void> {
  await db.query(`UPDATE settings SET automation_enabled = $1, updated_at = now(), updated_by = $2 WHERE id = 1`, [
    enabled,
    actor,
  ]);
  await audit(db, actor, enabled ? "automation_on" : "automation_paused");
}

export async function updateSchedule(
  db: Db,
  input: { publishTime: string; reviewLeadHours: number },
  actor: string
): Promise<{ ok: boolean; error?: string }> {
  if (!HHMM_RE.test(input.publishTime)) return { ok: false, error: "Enter the posting time as HH:MM." };
  if (!Number.isInteger(input.reviewLeadHours) || input.reviewLeadHours < LEAD_MIN || input.reviewLeadHours > LEAD_MAX) {
    return { ok: false, error: `The approval email can go out ${LEAD_MIN}–${LEAD_MAX} hours before posting.` };
  }
  const before = await getSettings(db);
  await db.query(
    `UPDATE settings SET publish_time = $1, review_lead_hours = $2, updated_at = now(), updated_by = $3 WHERE id = 1`,
    [input.publishTime, input.reviewLeadHours, actor]
  );

  // A new posting time also moves anything already scheduled (incl. approved posts not yet live).
  if (before.publishTime !== input.publishTime) {
    const now = new Date();
    for (const p of await pipeline(db)) {
      if (!p.slot_at || p.slot_at.getTime() <= now.getTime()) continue;
      let slot = slotOnIstDay(p.slot_at, input.publishTime);
      if (slot.getTime() <= now.getTime()) slot = nextSlot(now, input.publishTime);
      await moveToSlot(db, p.id, slot);
    }
  }
  await audit(db, actor, "schedule_changed", null, {
    from: { publishTime: before.publishTime, reviewLeadHours: before.reviewLeadHours },
    to: input,
  });
  return { ok: true };
}
