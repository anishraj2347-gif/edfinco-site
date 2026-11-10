// Admin: copy every consultation request to the Google Sheet (e.g. right after connecting it).
import type { NextRequest } from "next/server";
import { guardAdminPost } from "@/lib/server/admin-guard";
import { audit } from "@/lib/server/audit";
import { methodNotAllowed, seeOther } from "@/lib/server/http";
import { backfillSheet, flushSheetQueue, sheetEnabled } from "@/lib/server/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<Response> {
  const g = await guardAdminPost(request);
  if (g instanceof Response) return g;
  if (!sheetEnabled()) return seeOther("/admin/leads?error=" + encodeURIComponent("The Google Sheet isn't connected yet."));
  const queued = await backfillSheet(g.db);
  const r = await flushSheetQueue(g.db);
  await audit(g.db, g.admin.email, "sheet_backfill", null, { queued, sent: r.sent });
  return seeOther(r.failed ? "/admin/leads?msg=sheet-queued" : "/admin/leads?msg=sheet-synced");
}

export const GET = () => methodNotAllowed("POST");
