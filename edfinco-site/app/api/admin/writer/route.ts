// Main admin only: connect, test or disconnect the Claude writer (the owner's Claude Code routine on
// their own Claude plan). The token is never sent back to the browser or written to the audit log.
import type { NextRequest } from "next/server";
import { guardAdminPost } from "@/lib/server/admin-guard";
import { audit } from "@/lib/server/audit";
import { methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { allow } from "@/lib/server/rate-limit";
import { clearWriter, fireRoutine, getWriter, recordTest, saveWriter } from "@/lib/server/writer-connection";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const back = (q: string) => seeOther(`/admin/writer?${q}`);
const fail = (m: string) => back(`error=${encodeURIComponent(m)}`);

export async function POST(request: NextRequest): Promise<Response> {
  const g = await guardAdminPost(request);
  if (g instanceof Response) return g;
  if (!g.admin.isMain) return fail("Only a main admin can change the Claude writer connection.");
  const form = await readForm(request, 4_000);
  const action = form?.get("action") ?? "";
  const who = g.admin.email;

  switch (action) {
    case "save": {
      const url = (form?.get("url") ?? "").trim();
      const token = (form?.get("token") ?? "").trim();
      const error = await saveWriter(g.db, url, token, who);
      if (error) return fail(error);
      await audit(g.db, who, "writer_connected", null, { routine: url.match(/routines\/([^/]+)\/fire$/)?.[1] ?? null });
      return back("msg=saved");
    }
    case "disconnect": {
      await clearWriter(g.db);
      await audit(g.db, who, "writer_disconnected", null);
      return back("msg=disconnected");
    }
    case "test": {
      // Each test starts a short run on the owner's Claude plan, so keep it to a few an hour.
      if (!(await allow(g.db, "writer-test", 6, 3600))) return fail("Please wait a little before testing again (6 tests an hour).");
      const writer = await getWriter(g.db);
      if (!writer) return fail("Connect the writer first.");
      const fired = await fireRoutine(writer, JSON.stringify({ jobId: "connection-test", token: "connection-test", kind: "test" }));
      const detail = fired.ok ? "Claude accepted the test run." : fired.error;
      if (writer.source === "dashboard") await recordTest(g.db, fired.ok, detail, fired.ok ? fired.sessionUrl : null);
      await audit(g.db, who, fired.ok ? "writer_test_ok" : "writer_test_failed", null, fired.ok ? null : { error: detail.slice(0, 200) });
      return fired.ok ? back("msg=tested") : fail(`The test didn't go through: ${detail}`);
    }
    default:
      return fail("Unknown action.");
  }
}

export const GET = () => methodNotAllowed("POST");
