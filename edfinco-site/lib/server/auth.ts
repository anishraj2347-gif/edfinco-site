// Admin sign-in with one-time email links (no passwords to leak or forget).
//  - Only main admins (MAIN_ADMIN_EMAILS) and APPROVED members from /admin/team can receive a link
//    (pending requests get nothing); everyone gets the same response, so the form can't reveal who
//    has access.
//  - Links are 256-bit random, single-use, expire in 15 minutes, and are consumed by an explicit
//    POST (a mail scanner pre-fetching the URL can't use them up or sign anyone in).
//  - Sessions: random 256-bit token in an HttpOnly, Secure, SameSite=Lax cookie (__Host- prefixed
//    in production), only its hash is stored, 7-day lifetime, revoked on sign-out or when the
//    member is removed (access and role are re-checked against the database on every request).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Db } from "./db";
import { getDb } from "./db";
import { config } from "./config";
import { staffFor, type Staff } from "./staff";
import { hashToken, newToken, TOKEN_RE } from "./crypto";

export const SESSION_COOKIE = config.isProd ? "__Host-edfinco_admin" : "edfinco_admin";
const SESSION_DAYS = 7;

export type { Staff };
/** Kept for the blog-automation code: an Admin is a Staff member with the admin role. */
export type Admin = Staff;

export async function createLoginToken(db: Db, email: string): Promise<string> {
  const token = newToken();
  await db.query(
    `INSERT INTO login_tokens (token_hash, email, expires_at) VALUES ($1, $2, now() + interval '15 minutes')`,
    [hashToken(token), email.toLowerCase()]
  );
  // Housekeeping: drop long-expired tokens and sessions.
  await db.query(`DELETE FROM login_tokens WHERE expires_at < now() - interval '1 day'`);
  await db.query(`DELETE FROM admin_sessions WHERE expires_at < now()`);
  return token;
}

/** Marks a login token used (once) and returns its email if it is still valid. */
export async function consumeLoginToken(db: Db, token: string): Promise<string | null> {
  if (!TOKEN_RE.test(token)) return null;
  const rows = await db.query<{ email: string }>(
    `UPDATE login_tokens SET used_at = now()
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
     RETURNING email`,
    [hashToken(token)]
  );
  const email = rows[0]?.email ?? null;
  return email && (await staffFor(db, email)) ? email : null;
}

export async function createSession(db: Db, email: string): Promise<{ token: string; expires: Date }> {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.query(`INSERT INTO admin_sessions (token_hash, email, expires_at) VALUES ($1, $2, $3::timestamptz)`, [
    hashToken(token),
    email,
    expires.toISOString(),
  ]);
  return { token, expires };
}

export function sessionCookie(token: string, expires: Date) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: config.isProd,
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}

export async function destroySession(db: Db, token: string | undefined): Promise<void> {
  if (token && TOKEN_RE.test(token)) {
    await db.query(`DELETE FROM admin_sessions WHERE token_hash = $1`, [hashToken(token)]);
  }
}

/** The signed-in staff member for this request (admin or team), or null. */
export async function getStaff(): Promise<Staff | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !TOKEN_RE.test(token)) return null;
  const db = await getDb();
  const rows = await db.query<{ email: string }>(
    `UPDATE admin_sessions SET last_seen_at = now()
     WHERE token_hash = $1 AND expires_at > now()
     RETURNING email`,
    [hashToken(token)]
  );
  const email = rows[0]?.email;
  return email ? staffFor(db, email) : null;
}

/** The signed-in ADMIN (full access), or null. Team members are not admins. */
export async function getAdmin(): Promise<Staff | null> {
  const staff = await getStaff();
  return staff?.role === "admin" ? staff : null;
}

/** For consultation-request pages: any staff member, or a redirect to sign in. */
export async function requireStaff(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}

/** For blog-automation pages: an admin. Team members are sent to the consultation requests. */
export async function requireAdmin(): Promise<Staff> {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  if (staff.role !== "admin") redirect("/admin/leads");
  return staff;
}
