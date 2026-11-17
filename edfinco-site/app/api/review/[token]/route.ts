// Review-chat actions (no sign-in needed). The emailed link's token opens ONE post's review chat;
// it authorises only approving it or asking the writer for changes, and every action names the
// version shown on the page, which must still be the newest one and awaiting review. Plain form
// posts get a redirect back to the page; the chat's fetch() calls (Accept: application/json) get JSON.
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { clientIp, isSameOrigin, json, methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { lookupReviewToken } from "@/lib/server/posts";
import { allow } from "@/lib/server/rate-limit";
import { approvePost, requestChanges } from "@/lib/server/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }): Promise<Response> {
  const wantsJson = (request.headers.get("accept") ?? "").includes("application/json");
  const reply = (redirect: string, body: Record<string, unknown>, status = 200) =>
    wantsJson ? json(body, status) : seeOther(redirect);

  if (!isSameOrigin(request)) return json({ ok: false, error: "Forbidden." }, 403);
  const { token } = await params;
  const db = await getDb();
  if (!(await allow(db, `review-post:${clientIp(request)}`, 30, 3600))) {
    return json({ ok: false, error: "Too many requests. Please wait a little and try again." }, 429);
  }

  const found = await lookupReviewToken(db, token);
  const page = `/review/${encodeURIComponent(token)}`;
  if (!found) return reply(page, { ok: false, error: "This link has expired." }, 410);
  const { post } = found;

  const form = await readForm(request, 12_000);
  const action = form?.get("action");
  const version = Number(form?.get("version") ?? "-1");
  const stale = { ok: false, stale: true, error: "This draft has changed since you opened it. The page will reload." };
  // Act only on the version the person is looking at, while it is the newest and awaiting review.
  if (version !== post.version || post.status !== "pending_review") return reply(`${page}?done=stale`, stale, 409);
  const actor = "approval email link";

  if (action === "approve") {
    const p = await approvePost(db, post.id, version, actor);
    return p ? reply(`${page}?done=approved`, { ok: true, status: p.status }) : reply(`${page}?done=stale`, stale, 409);
  }
  if (action === "changes") {
    const feedback = (form?.get("feedback") ?? "").trim();
    if (feedback.length < 5 || feedback.length > 4000) {
      return reply(`${page}?error=feedback#chat`, { ok: false, error: "Please describe the change (5 to 4000 characters)." }, 400);
    }
    const r = await requestChanges(db, post.id, version, feedback, actor);
    if (!r.ok) return reply(`${page}?done=stale`, stale, 409);
    // r.error here means the change is saved but the writer couldn't be started yet (the scheduler retries).
    return reply(`${page}?done=changes#chat`, { ok: true, status: "revising", queued: Boolean(r.error) });
  }
  return reply(page, { ok: false, error: "Unknown action." }, 400);
}

export const GET = () => methodNotAllowed("POST");
