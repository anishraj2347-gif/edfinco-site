// Signs the admin out: deletes the session server-side and expires the cookie.
import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/server/audit";
import { destroySession, getStaff, SESSION_COOKIE, sessionCookie } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { isSameOrigin, json, methodNotAllowed } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  if (!isSameOrigin(request)) return json({ ok: false, error: "Forbidden." }, 403);
  const db = await getDb();
  const admin = await getStaff();
  await destroySession(db, request.cookies.get(SESSION_COOKIE)?.value);
  if (admin) await audit(db, admin.email, "signed_out");
  const res = new NextResponse(null, { status: 303, headers: { Location: "/admin/login?out=1", "Cache-Control": "no-store" } });
  res.cookies.set({ ...sessionCookie("", new Date(0)), maxAge: 0 });
  return res;
}

export const GET = () => methodNotAllowed("POST");
