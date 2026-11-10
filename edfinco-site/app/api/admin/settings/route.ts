// Admin: change the posting time and how many hours before it the approval email goes out.
import type { NextRequest } from "next/server";
import { guardAdminPost } from "@/lib/server/admin-guard";
import { methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { updateSchedule } from "@/lib/server/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const g = await guardAdminPost(request);
  if (g instanceof Response) return g;
  const form = await readForm(request, 2_000);
  const publishTime = (form?.get("publishTime") ?? "").trim().slice(0, 5);
  const reviewLeadHours = Number((form?.get("reviewLeadHours") ?? "").trim());
  const r = await updateSchedule(g.db, { publishTime, reviewLeadHours }, g.admin.email);
  return seeOther(r.ok ? "/admin?msg=schedule-saved" : `/admin?error=${encodeURIComponent(r.error ?? "Could not save.")}`);
}

export const GET = () => methodNotAllowed("POST");
