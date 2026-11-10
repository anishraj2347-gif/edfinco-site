// Admin: actions on one post (approve, publish now, request changes, reject, withdraw, retry,
// unpublish). Every action is version-checked or state-checked in lib/server/posts.ts.
import type { NextRequest } from "next/server";
import { guardAdminPost } from "@/lib/server/admin-guard";
import { audit } from "@/lib/server/audit";
import { methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { getPostById, publishNow, reject, unpublish, withdraw } from "@/lib/server/posts";
import { approvePost, requestChanges, retryPost } from "@/lib/server/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const g = await guardAdminPost(request);
  if (g instanceof Response) return g;
  const { id } = await params;
  const post = await getPostById(g.db, id);
  if (!post) return seeOther("/admin?error=" + encodeURIComponent("Post not found."));

  const form = await readForm(request, 12_000);
  const action = form?.get("action") ?? "";
  const version = Number(form?.get("version") ?? "-1");
  const back = (q: string) => seeOther(`/admin/posts/${post.id}?${q}`);
  const fail = (m: string) => back(`error=${encodeURIComponent(m)}`);
  const who = g.admin.email;

  switch (action) {
    case "approve": {
      const p = await approvePost(g.db, post.id, version, who);
      return p ? back("msg=approved") : fail("This version can't be approved (already handled or a newer version exists).");
    }
    case "publish-now": {
      const p = await publishNow(g.db, post.id, who);
      if (p) await audit(g.db, who, "published_now", post.id);
      return p ? back("msg=published") : fail("Only a reviewed or approved post can be published.");
    }
    case "changes": {
      const feedback = (form?.get("feedback") ?? "").trim();
      if (feedback.length < 5 || feedback.length > 4000) return fail("Describe the changes (5–4000 characters).");
      const r = await requestChanges(g.db, post.id, version, feedback, who);
      if (!r.ok) return fail(r.error ?? "Could not request changes.");
      return back(r.error ? `msg=changes-queued&warn=${encodeURIComponent(r.error)}` : "msg=changes-requested");
    }
    case "reject-skip":
    case "reject-replace": {
      const mode = action === "reject-skip" ? "skip" : "replace";
      const p = await reject(g.db, post.id, mode);
      if (p) await audit(g.db, who, `rejected_${mode}`, post.id);
      return p ? back(`msg=rejected-${mode}`) : fail("This post can't be rejected now.");
    }
    case "withdraw": {
      const p = await withdraw(g.db, post.id);
      if (p) await audit(g.db, who, "approval_withdrawn", post.id);
      return p ? back("msg=withdrawn") : fail("Only an approved post that isn't live yet can be withdrawn.");
    }
    case "unpublish": {
      const p = await unpublish(g.db, post.id);
      if (p) await audit(g.db, who, "unpublished", post.id);
      return p ? back("msg=unpublished") : fail("Only a live post can be taken down.");
    }
    case "retry": {
      const r = await retryPost(g.db, post.id, who);
      return r.ok ? back("msg=retrying") : fail(r.error ?? "Could not retry.");
    }
    default:
      return fail("Unknown action.");
  }
}

export const GET = () => methodNotAllowed("POST");
