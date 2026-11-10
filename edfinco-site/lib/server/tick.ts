// The scheduler "tick". Called hourly by GitHub Actions (/api/automation/tick, with CRON_SECRET)
// and opportunistically when people visit the blog or the dashboard, so the schedule keeps
// running even if one trigger is late. A database lock makes concurrent ticks harmless.
//
// Each tick:
//  1. retries writer jobs that failed to start or got stuck (gives up after 3 attempts),
//  2. sends "Published" emails for approved posts that have just gone live,
//     and (always) retries consultation-request alerts + nudges the team about uncontacted ones,
//  3. (automation on) moves unapproved posts whose slot passed to the next slot — nothing unapproved
//     is ever published — and emails the admin,
//  4. (automation on) sends a reminder when a waiting post is within 2 hours of its slot,
//  5. (automation on) starts the next draft once "posting time − email lead time" is reached.
import { getDb } from "./db";
import { config } from "./config";
import { audit } from "./audit";
import { sendToAdmins } from "./notify";
import { missedSlotEmail, publishedEmail, reminderEmail, writerProblemEmail } from "./email-templates";
import { fireJob, MAX_ATTEMPTS, openJobs, STUCK_AFTER_MIN } from "./jobs";
import {
  dueForPublishedEmail,
  getPostById,
  hasOpenWork,
  moveToSlot,
  pipeline,
  setPublishedNotified,
  setReminderSent,
  slotTaken,
} from "./posts";
import { addDays, istHour, nextSlot, reviewDueAt } from "./schedule";
import { getSettings } from "./settings";
import { reviewUrlFor, startDraftForSlot, writerGaveUp } from "./workflow";
import { leadsNeedingAlert, leadsNeedingNudge, leadsToMarkPartial, markPartial } from "./leads";
import { alertPartial, alertTeam, nudgeTeam } from "./lead-workflow";
import { flushSheetQueue } from "./sheets";

export interface TickResult {
  ran: boolean;
  reason?: string;
  actions: string[];
}

const MIN = 60_000;

export async function runTick(source: string): Promise<TickResult> {
  const db = await getDb();
  const lock = await db.query(
    `UPDATE settings SET tick_lock_until = now() + interval '3 minutes', last_tick_at = now()
     WHERE id = 1 AND (tick_lock_until IS NULL OR tick_lock_until < now()) RETURNING id`
  );
  if (!lock.length) return { ran: false, reason: "Another tick is already running.", actions: [] };

  const actions: string[] = [];
  try {
    const settings = await getSettings(db);
    const now = new Date();

    // 1. Writer jobs.
    for (const job of await openJobs(db)) {
      const running = job.status === "fired" && job.fired_at && now.getTime() - job.fired_at.getTime() < STUCK_AFTER_MIN * MIN;
      if (running) continue;
      if (job.attempts >= MAX_ATTEMPTS) {
        await writerGaveUp(
          db,
          job,
          `The writer didn't deliver after ${job.attempts} attempts.${job.last_error ? ` Last error: ${job.last_error}` : ""}`
        );
        actions.push(`gave up on ${job.kind} job ${job.id}`);
        continue;
      }
      const r = await fireJob(db, job);
      actions.push(`${job.status === "fired" ? "re-fired" : "fired"} ${job.kind} job ${job.id}: ${r.ok ? "ok" : r.error}`);
    }

    // 2. Newly live posts.
    for (const p of await dueForPublishedEmail(db)) {
      await sendToAdmins(publishedEmail(p));
      await setPublishedNotified(db, p.id);
      await audit(db, "system", "published", p.id, { slug: p.slug });
      actions.push(`published ${p.slug}`);
    }

    // 2b. Consultation requests (always, even with the blog automation paused): retry team alerts
    //     that didn't go out, and nudge the team once about requests still "New" after 2 hours
    //     (only 9 am–9 pm India time, so nobody is emailed in the middle of the night).
    // Students who gave contact details + consent but left before step 2 → partial leads.
    for (const started of await leadsToMarkPartial(db)) {
      const lead = await markPartial(db, started.id);
      if (lead) {
        await alertPartial(db, lead);
        actions.push(`partial lead ${lead.ref}`);
      }
    }
    for (const lead of await leadsNeedingAlert(db)) {
      if (lead.stage === "partial") await alertPartial(db, lead);
      else await alertTeam(db, lead);
      actions.push(`retried alert for ${lead.ref}`);
    }
    const sheet = await flushSheetQueue(db);
    if (sheet.sent || sheet.failed) actions.push(`sheet: ${sheet.sent} sent${sheet.failed ? ", will retry" : ""}`);
    const hour = istHour(now);
    if (hour >= 9 && hour < 21) {
      for (const lead of await leadsNeedingNudge(db)) {
        await nudgeTeam(db, lead);
        actions.push(`nudged team about ${lead.ref}`);
      }
    }

    if (!settings.automationEnabled) return { ran: true, reason: "Automation is paused.", actions };

    // 3. Missed slots → next free slot (never publish anything unapproved).
    for (const p of await pipeline(db)) {
      if (p.status === "approved" || !p.slot_at || p.slot_at.getTime() > now.getTime()) continue;
      let slot = nextSlot(now, settings.publishTime);
      for (let i = 0; i < 14 && (await slotTaken(db, slot)); i++) slot = addDays(slot, 1);
      if (!(await moveToSlot(db, p.id, slot))) continue;
      const moved = (await getPostById(db, p.id)) ?? p;
      const url = moved.status === "pending_review" ? await reviewUrlFor(db, moved) : null;
      await sendToAdmins(missedSlotEmail(moved, slot, url));
      await audit(db, "scheduler", "moved_to_next_slot", p.id, { slot: slot.toISOString() });
      actions.push(`moved ${p.id} to ${slot.toISOString()}`);
    }

    // 4. Reminders.
    for (const p of await pipeline(db)) {
      if (p.status !== "pending_review" || !p.slot_at || p.reminder_sent_at) continue;
      const left = p.slot_at.getTime() - now.getTime();
      const sentAgo = now.getTime() - p.updated_at.getTime();
      if (left <= 0 || left > 120 * MIN || sentAgo < 60 * MIN) continue;
      await sendToAdmins(reminderEmail(p, await reviewUrlFor(db, p)));
      await setReminderSent(db, p.id);
      await audit(db, "scheduler", "reminder_sent", p.id);
      actions.push(`reminder for ${p.id}`);
    }

    // 5. Next draft.
    const slot = nextSlot(now, settings.publishTime);
    const due = reviewDueAt(slot, settings.reviewLeadHours);
    if (now.getTime() >= due.getTime() && !(await slotTaken(db, slot)) && !(await hasOpenWork(db))) {
      const started = await startDraftForSlot(db, slot, `scheduler (${source})`);
      if (started) {
        actions.push(`started draft for ${slot.toISOString()}: ${started.started ? "writer running" : started.error}`);
        if (!started.started && config.isProd) {
          await sendToAdmins(
            writerProblemEmail(started.post, `The writer couldn't be started: ${started.error ?? "unknown error"}`)
          );
        }
      }
    }
    return { ran: true, actions };
  } finally {
    await db.query(`UPDATE settings SET tick_lock_until = NULL WHERE id = 1`);
  }
}

/** Runs a tick if none ran in the last 10 minutes. Never throws (safe inside after()). */
export async function maybeTick(source: string): Promise<void> {
  try {
    const db = await getDb();
    const rows = await db.query<{ due: boolean }>(
      `SELECT (last_tick_at IS NULL OR last_tick_at < now() - interval '10 minutes') AS due FROM settings WHERE id = 1`
    );
    if (rows[0]?.due) await runTick(source);
  } catch (err) {
    console.error("[tick] opportunistic tick failed", err);
  }
}
