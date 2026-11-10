// Consultation requests ("leads") from /consultation, worked by the team in /admin/leads.
// Privacy: only what the student typed into the form plus the consent record is stored — no IP
// address, device or tracking data. Every query is parameterised; search input is escaped.
import { randomInt } from "node:crypto";
import type { Db } from "./db";
import { hashToken, newToken, TOKEN_RE, uuid, UUID_RE } from "./crypto";

export type LeadStatus = "new" | "contacted" | "in_progress" | "converted" | "not_interested" | "spam";

export const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "in_progress", "converted", "not_interested", "spam"];

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  in_progress: "In progress",
  converted: "Converted",
  not_interested: "Not interested",
  spam: "Spam / invalid",
};

/** Statuses the team still has to act on. */
export const OPEN_STATUSES: LeadStatus[] = ["new", "contacted", "in_progress"];

/** Two-step form progress. */
export type LeadStage = "started" | "partial" | "complete";
export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  started: "Filling in now",
  partial: "Incomplete",
  complete: "Complete",
};
/** A step-1-only request becomes "partial" (and goes to the team) after this long. */
export const PARTIAL_AFTER_MIN = 30;

export interface LeadRow {
  id: string;
  ref: string;
  status: LeadStatus;
  assigned_to: string | null;
  student_name: string;
  email: string;
  phone: string;
  destination: string;
  study_level: string;
  intake: string;
  co_borrower: string;
  message: string;
  consent_text: string;
  consent_at: Date;
  source: string;
  notified_at: Date | null;
  notify_attempts: number;
  confirmation_sent_at: Date | null;
  first_contacted_at: Date | null;
  reminder_sent_at: Date | null;
  stage: LeadStage;
  was_partial: boolean;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface LeadNoteRow {
  id: number;
  lead_id: string;
  at: Date;
  author: string;
  kind: "note" | "status" | "assign" | "system";
  body: string;
}

export interface LeadInput {
  studentName: string;
  email: string;
  phone: string;
  destination: string;
  studyLevel: string;
  intake: string;
  coBorrower: string;
  message: string;
  consentText: string;
}

const COLS = `id, ref, status, assigned_to, student_name, email, phone, destination, study_level, intake,
  co_borrower, message, consent_text, consent_at, source, notified_at, notify_attempts, confirmation_sent_at,
  first_contacted_at, reminder_sent_at, stage, was_partial, completed_at, created_at, updated_at`;

const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // no 0/O/1/I/L — easy to read out on a call

export function newRef(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return `EDF-${s}`;
}

const one = <T>(rows: T[]): T | null => rows[0] ?? null;

export async function addNote(
  db: Db,
  leadId: string,
  author: string,
  kind: LeadNoteRow["kind"],
  body: string
): Promise<void> {
  await db.query(`INSERT INTO lead_notes (lead_id, author, kind, body) VALUES ($1, $2, $3, $4)`, [
    leadId,
    author.slice(0, 200),
    kind,
    body.slice(0, 4000),
  ]);
  await db.query(`UPDATE leads SET updated_at = now() WHERE id = $1`, [leadId]);
}

/**
 * Stores a request. The same person (email + phone) submitting again within 30 minutes is treated
 * as the same request (double clicks, resubmits): it's noted on the existing one, not duplicated.
 */
export async function createLead(db: Db, input: LeadInput): Promise<{ lead: LeadRow; duplicate: boolean }> {
  const dup = one(
    await db.query<LeadRow>(
      `SELECT ${COLS} FROM leads
       WHERE lower(email) = lower($1) AND phone = $2 AND created_at > now() - interval '30 minutes'
       ORDER BY created_at DESC LIMIT 1`,
      [input.email, input.phone]
    )
  );
  if (dup) {
    const extra = input.message && input.message !== dup.message ? ` New message: ${input.message}` : "";
    await addNote(db, dup.id, "website", "system", `Submitted the form again.${extra}`);
    return { lead: dup, duplicate: true };
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const row = one(
      await db.query<LeadRow>(
        `INSERT INTO leads (id, ref, student_name, email, phone, destination, study_level, intake, co_borrower,
                            message, consent_text, consent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
         ON CONFLICT (ref) DO NOTHING
         RETURNING ${COLS}`,
        [
          uuid(),
          newRef(),
          input.studentName,
          input.email,
          input.phone,
          input.destination,
          input.studyLevel,
          input.intake,
          input.coBorrower,
          input.message,
          input.consentText,
        ]
      )
    );
    if (row) return { lead: row, duplicate: false };
  }
  throw new Error("Could not allocate a lead reference.");
}

// ---------- Two-step form ----------

export interface ContactInput {
  studentName: string;
  email: string;
  phone: string;
  consentText: string;
}

export interface PlanInput {
  destination: string;
  studyLevel: string;
  intake: string;
  coBorrower: string;
  message: string;
}

/**
 * Step 1 (contact details + consent). Returns the request and a one-time "resume" token the
 * browser uses for step 2 (stored only as a hash, valid 24 h). Sending step 1 again with the token
 * (the student went back to fix a typo) updates the same request. The same person starting again
 * within 30 minutes reuses their request instead of creating a duplicate.
 */
export async function startLead(
  db: Db,
  input: ContactInput,
  resumeToken: string | null
): Promise<{ lead: LeadRow; token: string; reused: boolean }> {
  const token = newToken();
  const hash = hashToken(token);
  const params = [input.studentName, input.email, input.phone, input.consentText, hash];

  if (resumeToken && TOKEN_RE.test(resumeToken)) {
    const row = one(
      await db.query<LeadRow>(
        `UPDATE leads SET student_name = $1, email = $2, phone = $3, consent_text = $4, consent_at = now(),
           resume_token_hash = $5, resume_expires = now() + interval '24 hours', updated_at = now()
         WHERE resume_token_hash = $6 AND resume_expires > now() AND stage IN ('started', 'partial')
         RETURNING ${COLS}`,
        [...params, hashToken(resumeToken)]
      )
    );
    if (row) return { lead: row, token, reused: true };
  }

  const recent = one(
    await db.query<LeadRow>(
      `SELECT ${COLS} FROM leads
       WHERE lower(email) = lower($1) AND phone = $2 AND created_at > now() - interval '30 minutes'
       ORDER BY created_at DESC LIMIT 1`,
      [input.email, input.phone]
    )
  );
  if (recent) {
    await db.query(`UPDATE leads SET resume_token_hash = $2, resume_expires = now() + interval '24 hours' WHERE id = $1`, [
      recent.id,
      hash,
    ]);
    await addNote(db, recent.id, "website", "system", "Started the form again.");
    return { lead: recent, token, reused: true };
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const row = one(
      await db.query<LeadRow>(
        `INSERT INTO leads (id, ref, stage, student_name, email, phone, destination, study_level, intake,
                            consent_text, consent_at, resume_token_hash, resume_expires)
         VALUES ($6, $7, 'started', $1, $2, $3, '', '', '', $4, now(), $5, now() + interval '24 hours')
         ON CONFLICT (ref) DO NOTHING
         RETURNING ${COLS}`,
        [...params, uuid(), newRef()]
      )
    );
    if (row) return { lead: row, token, reused: false };
  }
  throw new Error("Could not allocate a lead reference.");
}

/** Step 2 (study plans). Completes the request the token belongs to, or null if it expired. */
export async function completeLead(db: Db, resumeToken: string, plan: PlanInput): Promise<LeadRow | null> {
  if (!TOKEN_RE.test(resumeToken)) return null;
  const row = one(
    await db.query<LeadRow>(
      `UPDATE leads SET destination = $2, study_level = $3, intake = $4, co_borrower = $5,
         message = CASE WHEN $6 = '' THEN message ELSE $6 END,
         was_partial = was_partial OR stage = 'partial',
         notified_at = CASE WHEN stage = 'complete' THEN notified_at ELSE NULL END,
         stage = 'complete', completed_at = COALESCE(completed_at, now()),
         resume_token_hash = NULL, resume_expires = NULL, updated_at = now()
       WHERE resume_token_hash = $1 AND resume_expires > now()
       RETURNING ${COLS}`,
      [hashToken(resumeToken), plan.destination, plan.studyLevel, plan.intake, plan.coBorrower, plan.message]
    )
  );
  if (row) await addNote(db, row.id, "website", "system", "Finished the consultation form (step 2).");
  return row;
}

/** Step-1-only requests left for PARTIAL_AFTER_MIN minutes. */
export function leadsToMarkPartial(db: Db): Promise<LeadRow[]> {
  return db.query<LeadRow>(
    `SELECT ${COLS} FROM leads
     WHERE stage = 'started' AND created_at < now() - ($1::int * interval '1 minute')
     ORDER BY created_at ASC LIMIT 50`,
    [PARTIAL_AFTER_MIN]
  );
}

export async function markPartial(db: Db, id: string): Promise<LeadRow | null> {
  const row = one(
    await db.query<LeadRow>(
      `UPDATE leads SET stage = 'partial', updated_at = now() WHERE id = $1 AND stage = 'started' RETURNING ${COLS}`,
      [id]
    )
  );
  if (row) await addNote(db, id, "website", "system", "Left the form after step 1 (contact details only).");
  return row;
}

export async function getLead(db: Db, id: string): Promise<LeadRow | null> {
  if (!UUID_RE.test(id)) return null;
  return one(await db.query<LeadRow>(`SELECT ${COLS} FROM leads WHERE id = $1`, [id]));
}

export interface LeadFilter {
  status?: string; // a LeadStatus, "open" or "all"
  q?: string;
  assigned?: string; // email, or "none"
  page?: number;
}

export const PAGE_SIZE = 50;

function whereFor(f: LeadFilter): { sql: string; params: unknown[] } {
  const parts: string[] = [];
  const params: unknown[] = [];
  const status = f.status ?? "open";
  if (status === "open") {
    // Constants from this file, not user input. Requests still being filled in aren't to-dos yet.
    parts.push(`status IN (${OPEN_STATUSES.map((s) => `'${s}'`).join(", ")}) AND stage <> 'started'`);
  } else if (status === "partial") {
    parts.push(`stage = 'partial'`);
  } else if ((LEAD_STATUSES as string[]).includes(status)) {
    params.push(status);
    parts.push(`status = $${params.length}`);
  }
  const q = (f.q ?? "").trim().slice(0, 100);
  if (q) {
    params.push(`%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`);
    const i = params.length;
    parts.push(
      `(student_name ILIKE $${i} ESCAPE '\\' OR email ILIKE $${i} ESCAPE '\\' OR phone ILIKE $${i} ESCAPE '\\' OR ref ILIKE $${i} ESCAPE '\\')`
    );
  }
  if (f.assigned === "none") parts.push(`assigned_to IS NULL`);
  else if (f.assigned) {
    params.push(f.assigned.toLowerCase());
    parts.push(`assigned_to = $${params.length}`);
  }
  return { sql: parts.length ? `WHERE ${parts.join(" AND ")}` : "", params };
}

export async function listLeads(db: Db, f: LeadFilter): Promise<{ rows: LeadRow[]; total: number }> {
  const { sql, params } = whereFor(f);
  const page = Math.max(1, Math.min(1000, Math.floor(f.page ?? 1)));
  const total = (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM leads ${sql}`, params))[0]?.n ?? 0;
  const rows = await db.query<LeadRow>(
    `SELECT ${COLS} FROM leads ${sql} ORDER BY created_at DESC LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`,
    params
  );
  return { rows, total };
}

/** Everything matching the filter (for CSV export), newest first, capped. */
export async function exportLeads(db: Db, f: LeadFilter, cap = 5000): Promise<LeadRow[]> {
  const { sql, params } = whereFor(f);
  return db.query<LeadRow>(`SELECT ${COLS} FROM leads ${sql} ORDER BY created_at DESC LIMIT ${cap}`, params);
}

export async function leadCounts(db: Db): Promise<Record<LeadStatus | "open" | "all" | "partial", number>> {
  const rows = await db.query<{ status: LeadStatus; stage: LeadStage; n: number }>(
    `SELECT status, stage, count(*)::int AS n FROM leads GROUP BY status, stage`
  );
  const out = Object.fromEntries([...LEAD_STATUSES, "open", "all", "partial"].map((s) => [s, 0])) as Record<
    LeadStatus | "open" | "all" | "partial",
    number
  >;
  for (const r of rows) {
    out[r.status] += r.n;
    out.all += r.n;
    if (r.stage === "partial") out.partial += r.n;
    if (OPEN_STATUSES.includes(r.status) && r.stage !== "started") out.open += r.n;
  }
  return out;
}

export async function oldestNewLead(db: Db): Promise<Date | null> {
  const rows = await db.query<{ at: Date | null }>(
    `SELECT min(created_at) AS at FROM leads WHERE status = 'new' AND stage <> 'started'`
  );
  return rows[0]?.at ?? null;
}

export async function setLeadStatus(db: Db, id: string, status: LeadStatus, actor: string): Promise<LeadRow | null> {
  const before = await getLead(db, id);
  if (!before || before.status === status) return before;
  const row = one(
    await db.query<LeadRow>(
      `UPDATE leads SET status = $2, updated_at = now(),
         first_contacted_at = CASE WHEN first_contacted_at IS NULL AND $2 <> 'new' THEN now() ELSE first_contacted_at END
       WHERE id = $1 RETURNING ${COLS}`,
      [id, status]
    )
  );
  if (row) {
    await addNote(db, id, actor, "status", `Status: ${LEAD_STATUS_LABEL[before.status]} → ${LEAD_STATUS_LABEL[status]}`);
  }
  return row;
}

export async function assignLead(db: Db, id: string, email: string | null, actor: string): Promise<boolean> {
  const rows = await db.query(`UPDATE leads SET assigned_to = $2, updated_at = now() WHERE id = $1 RETURNING id`, [
    id,
    email,
  ]);
  if (rows.length) await addNote(db, id, actor, "assign", email ? `Assigned to ${email}` : "Unassigned");
  return rows.length > 0;
}

export function notesOf(db: Db, id: string): Promise<LeadNoteRow[]> {
  return db.query<LeadNoteRow>(
    `SELECT id, lead_id, at, author, kind, body FROM lead_notes WHERE lead_id = $1 ORDER BY at DESC, id DESC`,
    [id]
  );
}

/** Permanently deletes a request and its notes (e.g. a data-erasure request). */
export async function deleteLead(db: Db, id: string): Promise<string | null> {
  const rows = await db.query<{ ref: string }>(`DELETE FROM leads WHERE id = $1 RETURNING ref`, [id]);
  return rows[0]?.ref ?? null;
}

// ---------- Notifications (used by the request handler and the scheduler) ----------

export function leadsNeedingAlert(db: Db): Promise<LeadRow[]> {
  return db.query<LeadRow>(
    `SELECT ${COLS} FROM leads
     WHERE notified_at IS NULL AND notify_attempts < 5 AND stage <> 'started'
       AND updated_at < now() - interval '2 minutes'
     ORDER BY created_at ASC LIMIT 20`
  );
}

export async function recordAlert(db: Db, id: string, ok: boolean): Promise<void> {
  await db.query(
    `UPDATE leads SET notify_attempts = notify_attempts + 1,
       notified_at = CASE WHEN $2 THEN now() ELSE notified_at END
     WHERE id = $1`,
    [id, ok]
  );
}

export async function recordConfirmation(db: Db, id: string): Promise<void> {
  await db.query(`UPDATE leads SET confirmation_sent_at = now() WHERE id = $1`, [id]);
}

/** New requests nobody has picked up for 2 hours (one nudge each). */
export function leadsNeedingNudge(db: Db): Promise<LeadRow[]> {
  return db.query<LeadRow>(
    `SELECT ${COLS} FROM leads
     WHERE status = 'new' AND stage = 'complete' AND reminder_sent_at IS NULL
       AND COALESCE(completed_at, created_at) < now() - interval '2 hours'
     ORDER BY created_at ASC LIMIT 20`
  );
}

export async function recordNudge(db: Db, id: string): Promise<void> {
  await db.query(`UPDATE leads SET reminder_sent_at = now() WHERE id = $1`, [id]);
}

/** Digits for a WhatsApp click-to-chat link (Indian 10-digit mobiles get +91), or null. */
export function whatsappNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (/^[6-9]\d{9}$/.test(digits)) return `91${digits}`;
  if (/^0[6-9]\d{9}$/.test(digits)) return `91${digits.slice(1)}`;
  if (/^91[6-9]\d{9}$/.test(digits)) return digits;
  if (phone.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

/** A dialable tel: value (digits and a leading +). */
export function telHref(phone: string): string {
  const t = phone.trim();
  return `tel:${t.startsWith("+") ? "+" : ""}${t.replace(/\D/g, "")}`;
}
