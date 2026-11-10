// Consumes a sign-in link (POST from the confirmation page) and starts a session.
import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/server/audit";
import { consumeLoginToken, createSession, sessionCookie } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { clientIp, isSameOrigin, json, methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { allow } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  if (!isSameOrigin(request)) return json({ ok: false, error: "Forbidden." }, 403);
  const db = await getDb();
  if (!(await allow(db, `verify-ip:${clientIp(request)}`, 20, 3600))) return seeOther("/admin/login?error=rate");

  const form = await readForm(request, 1_000);
  const email = await consumeLoginToken(db, form?.get("token") ?? "");
  if (!email) return seeOther("/admin/login?error=expired");

  const session = await createSession(db, email);
  await audit(db, email, "signed_in");
  const res = new NextResponse(null, {
    status: 303,
    headers: { Location: "/admin/leads", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
  res.cookies.set(sessionCookie(session.token, session.expires));
  return res;
}

export const GET = () => methodNotAllowed("POST");
