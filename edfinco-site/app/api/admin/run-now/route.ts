// Admin: write the next post's draft now instead of waiting for its approval-email time.
import type { NextRequest } from "next/server";
import { guardAdminPost } from "@/lib/server/admin-guard";
import { methodNotAllowed, seeOther } from "@/lib/server/http";
import { hasOpenWork, slotTaken } from "@/lib/server/posts";
import { addDays, nextSlot } from "@/lib/server/schedule";
import { getSettings } from "@/lib/server/settings";
import { startDraftForSlot } from "@/lib/server/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const g = await guardAdminPost(request);
  if (g instanceof Response) return g;
  if (await hasOpenWork(g.db)) return seeOther("/admin?error=" + encodeURIComponent("Finish or reject the post in progress first."));
  const s = await getSettings(g.db);
  let slot = nextSlot(new Date(), s.publishTime);
  for (let i = 0; i < 14 && (await slotTaken(g.db, slot)); i++) slot = addDays(slot, 1);
  const r = await startDraftForSlot(g.db, slot, g.admin.email);
  if (!r) return seeOther("/admin?error=" + encodeURIComponent("That slot is already taken."));
  return seeOther(r.started ? "/admin?msg=draft-started" : "/admin?error=" + encodeURIComponent(r.error ?? "Writer not started."));
}

export const GET = () => methodNotAllowed("POST");
