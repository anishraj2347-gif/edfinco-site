// Sends a one-time sign-in link to a staff email (admin or team). Same response whether or not the
// address has access (no account discovery); rate-limited per IP and per address.
import type { NextRequest } from "next/server";
import { config } from "@/lib/server/config";
import { staffFor } from "@/lib/server/staff";
import { createLoginToken } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { getDb } from "@/lib/server/db";
import { sendEmail } from "@/lib/server/email";
import { loginLinkEmail } from "@/lib/server/email-templates";
import { clientIp, isSameOrigin, json, methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { allow } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  if (!isSameOrigin(request)) return json({ ok: false, error: "Forbidden." }, 403);
  const form = await readForm(request, 2_000);
  const email = (form?.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return seeOther("/admin/login?error=email");

  const db = await getDb();
  const ip = clientIp(request);
  const okIp = await allow(db, `login-ip:${ip}`, 10, 3600);
  const okEmail = await allow(db, `login-email:${email}`, 5, 3600);
  if (!okIp || !okEmail) return seeOther("/admin/login?error=rate");

  if (await staffFor(db, email)) {
    const token = await createLoginToken(db, email);
    const link = `${config.appUrl}/admin/login/verify?token=${encodeURIComponent(token)}`;
    const sent = await sendEmail({ to: [email], ...loginLinkEmail(link) });
    await audit(db, email, sent.ok ? "login_link_sent" : "login_link_failed", null, sent.error ? { error: sent.error } : null);
  }
  return seeOther("/admin/login?sent=1");
}

export const GET = () => methodNotAllowed("POST");
