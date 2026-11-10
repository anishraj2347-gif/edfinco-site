// Admin: pause or resume the blog automation.
import { after, type NextRequest } from "next/server";
import { guardAdminPost } from "@/lib/server/admin-guard";
import { methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { setAutomation } from "@/lib/server/settings";
import { runTick } from "@/lib/server/tick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const g = await guardAdminPost(request);
  if (g instanceof Response) return g;
  const form = await readForm(request, 500);
  const enabled = form?.get("enabled") === "1";
  await setAutomation(g.db, enabled, g.admin.email);
  // Resuming may mean a draft is already due — check straight away.
  if (enabled) after(() => runTick("resumed").catch((err) => console.error("[tick] after resume", err)));
  return seeOther(enabled ? "/admin?msg=resumed" : "/admin?msg=paused");
}

export const GET = () => methodNotAllowed("POST");
