// Admin sign-in with email + password.
//  - Only main admins (MAIN_ADMIN_EMAILS) and APPROVED members from /admin/team can sign in.
//  - Passwords are stored as salted scrypt hashes (staff_passwords). A main admin who hasn't set a
//    password yet signs in with ADMIN_PASSWORD (server setting), then can change it in My details.
//  - Sessions: random 256-bit token in an HttpOnly, Secure, SameSite=Lax cookie (__Host- prefixed
//    in production), only its hash is stored, 7-day lifetime, revoked on sign-out or when the
//    member is removed (access and role are re-checked against the database on every request).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Db } from "./db";
import { getDb } from "./db";
import { config } from "./config";
import { staffFor, type Staff } from "./staff";
import { hashPassword, hashToken, newToken, safeEqual, TOKEN_RE, verifyPassword } from "./crypto";

export const SESSION_COOKIE = config.isProd ? "__Host-edfinco_admin" : "edfinco_admin";
const SESSION_DAYS = 7;

export type { Staff };
/** Kept for the blog-automation code: an Admin is a Staff member with the admin role. */
export type Admin = Staff;

export const PASSWORD_MIN = 10;

/** The staff member if this email + password is right (and they still have access), else null. */
export async function checkLogin(db: Db, email: string, password: string): Promise<Staff | null> {
  const staff = await staffFor(db, email);
  if (!staff || !password) return null;
  const rows = await db.query<{ hash: string }>(`SELECT hash FROM staff_passwords WHERE email = $1`, [staff.email]);
  if (rows[0]) return verifyPassword(password, rows[0].hash) ? staff : null;
  // No password stored yet: main admins use ADMIN_PASSWORD; everyone else can't sign in.
  return staff.isMain && config.adminPassword.length >= PASSWORD_MIN && safeEqual(password, config.adminPassword) ? staff : null;
}

/** Sets (or resets) someone's password. Returns an error message, or null when saved. */
export async function setPassword(db: Db, email: string, password: string): Promise<string | null> {
  if (password.length < PASSWORD_MIN) return `The password must be at least ${PASSWORD_MIN} characters.`;
  if (password.length > 200) return "That password is too long.";
  await db.query(
    `INSERT INTO staff_passwords (email, hash, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (email) DO UPDATE SET hash = $2, updated_at = now()`,
    [email.trim().toLowerCase(), hashPassword(password)]
  );
  return null;
}

export async function createSession(db: Db, email: string): Promise<{ token: string; expires: Date }> {
  await db.query(`DELETE FROM admin_sessions WHERE expires_at < now()`); // housekeeping
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
