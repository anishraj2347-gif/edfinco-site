// Email + password sign-in for staff (admin or team). One error message for every failure (no
// account discovery); rate-limited per IP and per address.
import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/server/audit";
import { checkLogin, createSession, sessionCookie } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { clientIp, isSameOrigin, json, methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { allow } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  if (!isSameOrigin(request)) return json({ ok: false, error: "Forbidden." }, 403);
  const form = await readForm(request, 2_000);
  const email = (form?.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = (form?.get("password") ?? "").slice(0, 200);

  const db = await getDb();
  const okIp = await allow(db, `login-ip:${clientIp(request)}`, 20, 3600);
  const okEmail = await allow(db, `login-email:${email}`, 10, 3600);
  if (!okIp || !okEmail) return seeOther("/admin/login?error=rate");

  const staff = await checkLogin(db, email, password);
  if (!staff) {
    await audit(db, email || "(blank)", "sign_in_failed");
    return seeOther(`/admin/login?error=wrong&email=${encodeURIComponent(email)}`);
  }
  const session = await createSession(db, staff.email);
  await audit(db, staff.email, "signed_in");
  const res = new NextResponse(null, { status: 303, headers: { Location: "/admin/leads", "Cache-Control": "no-store" } });
  res.cookies.set(sessionCookie(session.token, session.expires));
  return res;
}

export const GET = () => methodNotAllowed("POST");
