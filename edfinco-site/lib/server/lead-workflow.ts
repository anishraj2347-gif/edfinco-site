// Getting a consultation request to the right person as fast as possible.
//
// Routing: every new (or newly partial) request is assigned in turn to an active team member with
// "Gets new requests" switched on (lib/server/staff.ts pickAssignee), and ONLY that person is
// emailed. If nobody is in the rotation, the admins are emailed instead, so no request is orphaned.
// The 2-hour "not contacted yet" nudge goes to the assignee AND the main admin(s).
import type { Db } from "./db";
import { config } from "./config";
import { SITE } from "@/lib/content";
import { audit } from "./audit";
import { sendEmail } from "./email";
import {
  assignedLeadEmail,
  leadConfirmationEmail,
  leadNudgeEmail,
  newLeadEmail,
  partialLeadEmail,
  type AlertContext,
} from "./team-emails";
import { assignLead, getLead, recordAlert, recordConfirmation, recordNudge, type LeadRow } from "./leads";
import { flushSheetQueue, queueLeadSync } from "./sheets";
import { adminRecipients, nameOf, personFor, pickAssignee, staffFor } from "./staff";

/** Copy the request's current state to the Google Sheet (queued + delivered, retried by the tick). */
export async function syncSheet(db: Db, lead: LeadRow): Promise<void> {
  await queueLeadSync(db, lead);
  await flushSheetQueue(db);
}

/** Assigns an unassigned request to the next person in the rotation (if anyone is in it). */
async function ensureAssignee(db: Db, lead: LeadRow): Promise<LeadRow> {
  if (lead.assigned_to) return lead;
  const who = await pickAssignee(db);
  if (!who) return lead;
  await assignLead(db, lead.id, who, "auto-assign (rotation)");
  await audit(db, "system", "lead_auto_assigned", null, { ref: lead.ref, to: who });
  return (await getLead(db, lead.id)) ?? lead;
}

/** The assignee (if they still have access), otherwise the admins. */
async function route(db: Db, lead: LeadRow): Promise<{ to: string[]; ctx: AlertContext }> {
  if (lead.assigned_to && (await staffFor(db, lead.assigned_to))) {
    return { to: [lead.assigned_to], ctx: { assignee: await personFor(db, lead.assigned_to) } };
  }
  return { to: await adminRecipients(db), ctx: { assignee: null } };
}

/** New or completed request: assign, email ONE person (Reply-To = student), confirm to the student. */
export async function alertTeam(db: Db, input: LeadRow): Promise<void> {
  const lead = await ensureAssignee(db, input);
  const { to, ctx } = await route(db, lead);
  const sent = await sendEmail({ to, ...newLeadEmail(lead, ctx), replyTo: lead.email });
  await recordAlert(db, lead.id, sent.ok);
  await audit(db, "system", sent.ok ? "lead_alert_sent" : "lead_alert_failed", null, {
    ref: lead.ref,
    to,
    ...(sent.error ? { error: sent.error } : {}),
  });
  if (!lead.confirmation_sent_at) {
    const confirmed = await sendEmail({ to: [lead.email], ...leadConfirmationEmail(lead), replyTo: SITE.email });
    if (confirmed.ok) await recordConfirmation(db, lead.id);
  }
  await syncSheet(db, lead);
}

/** A student who gave contact details + consent but left before step 2: assign + tell that person. */
export async function alertPartial(db: Db, input: LeadRow): Promise<void> {
  const lead = await ensureAssignee(db, input);
  const { to, ctx } = await route(db, lead);
  const sent = await sendEmail({ to, ...partialLeadEmail(lead, ctx), replyTo: lead.email });
  await recordAlert(db, lead.id, sent.ok);
  await audit(db, "system", sent.ok ? "partial_lead_alert_sent" : "partial_lead_alert_failed", null, { ref: lead.ref, to });
  await syncSheet(db, lead);
}

/** Someone assigned the request to a colleague: email the new assignee. */
export async function notifyAssignee(db: Db, lead: LeadRow, by: string): Promise<void> {
  if (!lead.assigned_to || lead.assigned_to === by) return;
  if (!(await staffFor(db, lead.assigned_to))) return;
  const assignee = await personFor(db, lead.assigned_to);
  const byName = nameOf(await personFor(db, by), by);
  await sendEmail({ to: [lead.assigned_to], ...assignedLeadEmail(lead, assignee, byName), replyTo: lead.email });
}

/** One follow-up nudge for a request still "New" after 2 hours: the assignee + the main admin(s). */
export async function nudgeTeam(db: Db, lead: LeadRow): Promise<void> {
  const assignee = lead.assigned_to && (await staffFor(db, lead.assigned_to)) ? await personFor(db, lead.assigned_to) : null;
  const to = [...new Set([...(assignee ? [assignee.email] : []), ...config.mainAdminEmails])];
  const sent = await sendEmail({ to: to.length ? to : await adminRecipients(db), ...leadNudgeEmail(lead, assignee), replyTo: lead.email });
  if (sent.ok) {
    await recordNudge(db, lead.id);
    await audit(db, "system", "lead_nudge_sent", null, { ref: lead.ref, to });
  }
}
