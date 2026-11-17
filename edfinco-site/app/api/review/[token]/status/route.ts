// Polled by the review chat while the writer is working: returns only the post's status and its
// newest version number (nothing about the draft itself), so the page knows when to refresh.
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { clientIp, json, methodNotAllowed } from "@/lib/server/http";
import { lookupReviewToken } from "@/lib/server/posts";
import { allow } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }): Promise<Response> {
  const { token } = await params;
  const db = await getDb();
  // The chat polls every few seconds while a revision is in progress, and stops after 40 minutes.
  if (!(await allow(db, `review-status:${clientIp(request)}`, 900, 3600))) {
    return json({ ok: false, error: "Too many requests." }, 429);
  }
  const found = await lookupReviewToken(db, token);
  if (!found) return json({ ok: false, error: "This link has expired." }, 410);
  return json({ ok: true, status: found.post.status, version: found.post.version });
}

export const POST = () => methodNotAllowed("GET");
