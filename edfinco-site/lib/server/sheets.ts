// Google Sheet copy of consultation requests.
//
// Two tabs, one row per request (upserted by Reference, so status changes update the row):
//   "Submitted" — requests where the student finished the form
//   "Partial"   — requests where the student gave contact details + consent but left before step 2
// Delivery goes through the sheet_outbox table (in order, retried on failure). Production: an Apps
// Script web app in the owner's Sheet (automation/google-sheet-apps-script.gs) receives
// {secret, action, tab, row}. Local development: the same tabs are written to .data/sheets/*.csv.
import fs from "node:fs";
import path from "node:path";
import type { Db } from "./db";
import { config, sheetsConfigured } from "./config";
import { audit } from "./audit";
import { formatIst } from "./schedule";
import { getLead, LEAD_STATUS_LABEL, type LeadRow } from "./leads";
import { people, type Person } from "./staff";

export type SheetTab = "Submitted" | "Partial";

export const SHEET_HEADERS = [
  "Reference",
  "Received (IST)",
  "Stage",
  "Status",
  "Assigned to",
  "Student name",
  "Email",
  "Phone",
  "Destination",
  "Study level",
  "Intake",
  "Co-borrower",
  "Message",
  "Consent",
  "Completed (IST)",
  "Last updated (IST)",
] as const;

const MAX_ATTEMPTS = 20;

const localMode = (): boolean => !sheetsConfigured() && (!config.isProd || config.allowLocalDb);
export const sheetEnabled = (): boolean => sheetsConfigured() || localMode();

/** Spreadsheets run cells starting with = + - @ as formulas; force them to plain text. */
export function safeCell(v: string): string {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

function assignedLabel(lead: LeadRow, ppl: Map<string, Person>): string {
  if (!lead.assigned_to) return "";
  const p = ppl.get(lead.assigned_to);
  return p?.name ? `${p.name} (${lead.assigned_to})` : lead.assigned_to;
}

function rowFor(lead: LeadRow, stageLabel: string, ppl: Map<string, Person>): Record<string, string> {
  const values: Record<(typeof SHEET_HEADERS)[number], string> = {
    Reference: lead.ref,
    "Received (IST)": formatIst(lead.created_at),
    Stage: stageLabel,
    Status: LEAD_STATUS_LABEL[lead.status],
    "Assigned to": assignedLabel(lead, ppl),
    "Student name": lead.student_name,
    Email: lead.email,
    Phone: lead.phone,
    Destination: lead.destination,
    "Study level": lead.study_level,
    Intake: lead.intake,
    "Co-borrower": lead.co_borrower,
    Message: lead.message,
    Consent: `${lead.consent_text} (${formatIst(lead.consent_at)})`,
    "Completed (IST)": lead.completed_at ? formatIst(lead.completed_at) : "",
    "Last updated (IST)": formatIst(new Date()),
  };
  // Raw values: the Apps Script stores every cell as plain text (no formulas). The local CSV
  // preview applies safeCell() itself, because Excel would otherwise run =, +, -, @ as formulas.
  return values;
}

async function enqueue(db: Db, ref: string, action: "upsert" | "delete", tab: SheetTab | null, row: object | null) {
  await db.query(`INSERT INTO sheet_outbox (ref, action, tab, row) VALUES ($1, $2, $3, $4::jsonb)`, [
    ref,
    action,
    tab,
    row ? JSON.stringify(row) : null,
  ]);
}

/** Queue the current state of a request for the Sheet (nothing for requests still being filled in). */
export async function queueLeadSync(db: Db, lead: LeadRow): Promise<void> {
  if (!sheetEnabled() || lead.stage === "started") return;
  const ppl = await people(db);
  if (lead.stage === "complete") {
    await enqueue(db, lead.ref, "upsert", "Submitted", rowFor(lead, lead.was_partial ? "Completed later" : "Complete", ppl));
    if (lead.was_partial) await enqueue(db, lead.ref, "upsert", "Partial", rowFor(lead, "Completed later (see Submitted)", ppl));
  } else if (lead.stage === "partial") {
    await enqueue(db, lead.ref, "upsert", "Partial", rowFor(lead, "Incomplete: left after step 1", ppl));
  }
}

/** Data erasure: drop any queued copies and remove the request's rows from both tabs. */
export async function queueLeadDelete(db: Db, ref: string): Promise<void> {
  await db.query(`DELETE FROM sheet_outbox WHERE ref = $1 AND action = 'upsert'`, [ref]);
  if (sheetEnabled()) await enqueue(db, ref, "delete", null, null);
}

/** Copy every request to the Sheet (e.g. after connecting it for the first time). */
export async function backfillSheet(db: Db): Promise<number> {
  if (!sheetEnabled()) return 0;
  const rows = await db.query<LeadRow>(
    `SELECT id FROM leads WHERE stage IN ('complete', 'partial') ORDER BY created_at ASC LIMIT 5000`
  );
  let n = 0;
  for (const r of rows) {
    const lead = await getLead(db, r.id);
    if (lead) {
      await queueLeadSync(db, lead);
      n++;
    }
  }
  return n;
}

interface OutboxRow {
  id: number;
  ref: string;
  action: "upsert" | "delete";
  tab: SheetTab | null;
  row: Record<string, string> | null;
  attempts: number;
}

/** Delivers queued changes in order. Stops at the first failure so order is kept; retried later. */
export async function flushSheetQueue(db: Db): Promise<{ sent: number; failed: boolean }> {
  if (!sheetEnabled()) return { sent: 0, failed: false };
  const items = await db.query<OutboxRow>(
    `SELECT id, ref, action, tab, row, attempts FROM sheet_outbox ORDER BY id ASC LIMIT 100`
  );
  let sent = 0;
  for (const item of items) {
    const ok = await deliver(item).catch((err) => {
      console.error("[sheets] delivery failed", err);
      return false;
    });
    if (ok) {
      await db.query(`DELETE FROM sheet_outbox WHERE id = $1`, [item.id]);
      sent++;
      continue;
    }
    if (item.attempts + 1 >= MAX_ATTEMPTS) {
      await db.query(`DELETE FROM sheet_outbox WHERE id = $1`, [item.id]);
      await audit(db, "system", "sheet_sync_gave_up", null, { ref: item.ref, action: item.action, tab: item.tab });
    } else {
      await db.query(`UPDATE sheet_outbox SET attempts = attempts + 1, last_error = $2 WHERE id = $1`, [
        item.id,
        "Delivery failed",
      ]);
    }
    return { sent, failed: true };
  }
  return { sent, failed: false };
}

export async function pendingSheetChanges(db: Db): Promise<number> {
  return (await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM sheet_outbox`))[0]?.n ?? 0;
}

async function deliver(item: OutboxRow): Promise<boolean> {
  if (sheetsConfigured()) {
    const res = await fetch(config.sheetsWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: config.sheetsWebhookSecret,
        action: item.action,
        tab: item.tab,
        ref: item.ref,
        row: item.row,
      }),
      redirect: "follow", // Apps Script answers via a redirect to googleusercontent.com
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return data?.ok === true;
  }
  return deliverLocal(item);
}

// ---------- Local development: the same two tabs as CSV files in .data/sheets ----------

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (c !== "\r") cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const toCsv = (rows: string[][]): string =>
  "﻿" + rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\r\n") + "\r\n";

function deliverLocal(item: OutboxRow): boolean {
  const dir = path.join(process.cwd(), ".data", "sheets");
  fs.mkdirSync(dir, { recursive: true });
  const tabs: SheetTab[] = item.action === "delete" ? ["Submitted", "Partial"] : item.tab ? [item.tab] : [];
  for (const tab of tabs) {
    const file = path.join(dir, `${tab}.csv`);
    const rows = fs.existsSync(file) ? parseCsv(fs.readFileSync(file, "utf8").replace(/^﻿/, "")) : [];
    if (!rows.length) rows.push([...SHEET_HEADERS]);
    const at = rows.findIndex((r, i) => i > 0 && r[0] === item.ref);
    if (item.action === "delete") {
      const kept = rows.filter((r, i) => i === 0 || r[0] !== item.ref);
      fs.writeFileSync(file, toCsv(kept));
      continue;
    }
    const values = SHEET_HEADERS.map((h) => safeCell(item.row?.[h] ?? ""));
    if (at > 0) rows[at] = values;
    else rows.push(values);
    fs.writeFileSync(file, toCsv(rows));
  }
  return true;
}
