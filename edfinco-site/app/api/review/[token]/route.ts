// Approval-email actions (no sign-in needed): the link's token authorises ONLY approving or
// requesting changes to ONE version of ONE post, while that version is still awaiting review.
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { clientIp, isSameOrigin, json, methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { lookupReviewToken } from "@/lib/server/posts";
import { allow } from "@/lib/server/rate-limit";
import { approvePost, requestChanges } from "@/lib/server/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }): Promise<Response> {
  if (!isSameOrigin(request)) return json({ ok: false, error: "Forbidden." }, 403);
  const { token } = await params;
  const db = await getDb();
  if (!(await allow(db, `review-post:${clientIp(request)}`, 30, 3600))) return json({ ok: false, error: "Too many requests." }, 429);

  const found = await lookupReviewToken(db, token);
  const page = `/review/${encodeURIComponent(token)}`;
  if (!found) return seeOther(page);
  const { post, tokenVersion } = found;
  if (tokenVersion !== post.version || post.status !== "pending_review") return seeOther(page);

  const form = await readForm(request, 12_000);
  const action = form?.get("action");
  const version = Number(form?.get("version") ?? "-1");
  if (version !== tokenVersion) return seeOther(page);
  const actor = "approval email link";

  if (action === "approve") {
    const p = await approvePost(db, post.id, version, actor);
    return seeOther(`${page}?done=${p ? "approved" : "stale"}`);
  }
  if (action === "changes") {
    const feedback = (form?.get("feedback") ?? "").trim();
    if (feedback.length < 5 || feedback.length > 4000) return seeOther(`${page}?error=feedback#changes`);
    const r = await requestChanges(db, post.id, version, feedback, actor);
    return seeOther(`${page}?done=${r.ok ? "changes" : "stale"}`);
  }
  return seeOther(page);
}

export const GET = () => methodNotAllowed("POST");
