// CSV export of consultation requests (current filter) for Excel / Google Sheets. Signed-in staff
// only; every export is recorded in the activity log. Cells that a spreadsheet would treat as a
// formula (=, +, -, @) are neutralised (CSV injection).
import type { NextRequest } from "next/server";
import { getStaff } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { getDb } from "@/lib/server/db";
import { json } from "@/lib/server/http";
import { exportLeads, LEAD_STATUS_LABEL, type LeadRow } from "@/lib/server/leads";
import { formatIst, istDate } from "@/lib/server/schedule";
import { people, type Person } from "@/lib/server/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cell(v: string): string {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

const assigned = (l: LeadRow, ppl: Map<string, Person>): string => {
  if (!l.assigned_to) return "";
  const p = ppl.get(l.assigned_to);
  return p?.name ? `${p.name} (${l.assigned_to})` : l.assigned_to;
};

const COLUMNS: [string, (l: LeadRow, ppl: Map<string, Person>) => string][] = [
  ["Reference", (l) => l.ref],
  ["Received (IST)", (l) => formatIst(l.created_at)],
  ["Status", (l) => LEAD_STATUS_LABEL[l.status]],
  ["Assigned to", (l, ppl) => assigned(l, ppl)],
  ["Student name", (l) => l.student_name],
  ["Email", (l) => l.email],
  ["Phone", (l) => l.phone],
  ["Destination", (l) => l.destination],
  ["Study level", (l) => l.study_level],
  ["Intake", (l) => l.intake],
  ["Co-borrower", (l) => l.co_borrower],
  ["Message", (l) => l.message],
  ["First contacted (IST)", (l) => (l.first_contacted_at ? formatIst(l.first_contacted_at) : "")],
];

export async function GET(request: NextRequest): Promise<Response> {
  const staff = await getStaff();
  if (!staff) return json({ ok: false, error: "Sign in first." }, 401);
  const sp = request.nextUrl.searchParams;
  const filter = { status: sp.get("status") ?? "open", q: sp.get("q") ?? "", assigned: sp.get("assigned") ?? "" };
  const db = await getDb();
  const rows = await exportLeads(db, filter);
  await audit(db, staff.email, "leads_exported", null, { count: rows.length, status: filter.status, q: filter.q.slice(0, 50) });

  const ppl = await people(db);
  const lines = [COLUMNS.map(([h]) => cell(h)).join(","), ...rows.map((l) => COLUMNS.map(([, f]) => cell(f(l, ppl))).join(","))];
  const body = "﻿" + lines.join("\r\n") + "\r\n"; // BOM so Excel reads ₹ and accents correctly
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="edfinco-consultation-requests-${istDate(new Date())}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
