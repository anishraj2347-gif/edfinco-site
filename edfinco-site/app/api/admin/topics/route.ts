// Admin: add a topic to the backlog, or skip one.
import type { NextRequest } from "next/server";
import { guardAdminPost } from "@/lib/server/admin-guard";
import { audit } from "@/lib/server/audit";
import { methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { addTopics, skipTopic } from "@/lib/server/topics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const g = await guardAdminPost(request);
  if (g instanceof Response) return g;
  const form = await readForm(request, 2_000);
  const action = form?.get("action");
  if (action === "skip") {
    const id = Number(form?.get("id"));
    if (Number.isInteger(id) && id > 0) {
      await skipTopic(g.db, id);
      await audit(g.db, g.admin.email, "topic_skipped", null, { id });
    }
    return seeOther("/admin?msg=topic-skipped#topics");
  }
  const title = (form?.get("title") ?? "").trim();
  if (title.length < 8 || title.length > 300) {
    return seeOther("/admin?error=" + encodeURIComponent("A topic needs 8–300 characters.") + "#topics");
  }
  const added = await addTopics(g.db, [title]);
  if (added) await audit(g.db, g.admin.email, "topic_added", null, { title });
  return seeOther(added ? "/admin?msg=topic-added#topics" : "/admin?error=" + encodeURIComponent("That topic is already in the list.") + "#topics");
}

export const GET = () => methodNotAllowed("POST");
