// Who can use the dashboard.
//  - MAIN admin(s): MAIN_ADMIN_EMAILS (server setting). Always full access; the ONLY people who can
//    approve, reject or remove dashboard users. Can't be removed from the UI (no lock-out).
//  - Members added in /admin/team: role "admin" (everything) or "team" (consultation requests
//    only). Added by a non-main admin → 'pending' until a main admin approves. Only 'active'
//    members can receive a sign-in link; removing someone ends their sessions immediately.
import type { Db } from "./db";
import { config } from "./config";
import { audit } from "./audit";

export type Role = "admin" | "team";
export type StaffStatus = "pending" | "active" | "rejected" | "removed";

export interface Staff {
  email: string;
  role: Role;
  isMain: boolean;
}

export interface StaffRow {
  email: string;
  role: Role;
  status: StaffStatus;
  name: string | null;
  note: string | null;
  requested_by: string;
  requested_at: Date;
  decided_by: string | null;
  decided_at: Date | null;
  receives_leads: boolean;
  last_lead_at: Date | null;
}

/** A dashboard user's contact details (name/phone are '' until they've been filled in). */
export interface Person {
  email: string;
  name: string;
  phone: string;
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin (everything)",
  team: "Team (consultation requests only)",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-.\s]{6,20}$/;
const norm = (email: string) => email.trim().toLowerCase();
const cleanText = (s: string, max: number) => s.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, max);

function checkDetails(name: string, phone: string): { name: string; phone: string } | { error: string } {
  const n = cleanText(name, 100);
  const p = cleanText(phone, 20);
  if (n.length < 2) return { error: "Enter their full name." };
  if (!PHONE_RE.test(p)) return { error: "Enter a valid phone number (digits, spaces, + and - only)." };
  return { name: n, phone: p };
}

async function upsertProfile(db: Db, email: string, name: string, phone: string, by: string): Promise<void> {
  await db.query(
    `INSERT INTO staff_profiles (email, name, phone, updated_at, updated_by) VALUES ($1, $2, $3, now(), $4)
     ON CONFLICT (email) DO UPDATE SET name = $2, phone = $3, updated_at = now(), updated_by = $4`,
    [email, name, phone, by]
  );
}

export function isMainAdmin(email: string): boolean {
  return config.mainAdminEmails.includes(norm(email));
}

/** The dashboard access an address has right now, or null (pending/removed/unknown = none). */
export async function staffFor(db: Db, email: string): Promise<Staff | null> {
  const e = norm(email);
  if (!EMAIL_RE.test(e)) return null;
  if (isMainAdmin(e)) return { email: e, role: "admin", isMain: true };
  const rows = await db.query<{ role: Role }>(`SELECT role FROM staff WHERE email = $1 AND status = 'active'`, [e]);
  return rows[0] ? { email: e, role: rows[0].role, isMain: false } : null;
}

export function listStaff(db: Db): Promise<StaffRow[]> {
  return db.query<StaffRow>(
    `SELECT email, role, status, name, note, requested_by, requested_at, decided_by, decided_at, receives_leads,
            last_lead_at FROM staff
     ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'active' THEN 1 ELSE 2 END, requested_at DESC`
  );
}

export async function getStaffRow(db: Db, email: string): Promise<StaffRow | null> {
  const rows = await db.query<StaffRow>(
    `SELECT email, role, status, name, note, requested_by, requested_at, decided_by, decided_at, receives_leads,
            last_lead_at FROM staff WHERE email = $1`,
    [norm(email)]
  );
  return rows[0] ?? null;
}

/**
 * Adds someone. A main admin's addition is active at once; anyone else's waits for approval.
 */
export async function addStaff(
  db: Db,
  input: { email: string; role: string; name: string; phone: string; note: string },
  by: Staff
): Promise<{ ok: true; row: StaffRow } | { ok: false; error: string }> {
  if (by.role !== "admin") return { ok: false, error: "Only admins can add people." };
  const email = norm(input.email).slice(0, 254);
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  const details = checkDetails(input.name, input.phone);
  if ("error" in details) return { ok: false, error: details.error };
  if (input.role !== "admin" && input.role !== "team") return { ok: false, error: "Choose a role." };
  if (isMainAdmin(email)) return { ok: false, error: "That address is already a main admin." };
  const existing = await getStaffRow(db, email);
  if (existing?.status === "active") return { ok: false, error: "That person already has access." };
  if (existing?.status === "pending") return { ok: false, error: "That person is already waiting for approval." };

  const status: StaffStatus = by.isMain ? "active" : "pending";
  const rows = await db.query<StaffRow>(
    `INSERT INTO staff (email, role, status, name, note, requested_by, requested_at, decided_by, decided_at, receives_leads)
     VALUES ($1, $2, $3, $4, $5, $6, now(), $7, $8, $2 = 'team')
     ON CONFLICT (email) DO UPDATE SET role = $2, status = $3, name = $4, note = $5, requested_by = $6,
       requested_at = now(), decided_by = $7, decided_at = $8, receives_leads = ($2 = 'team')
     RETURNING email, role, status, name, note, requested_by, requested_at, decided_by, decided_at, receives_leads,
       last_lead_at`,
    [
      email,
      input.role,
      status,
      details.name,
      cleanText(input.note, 300) || null,
      by.email,
      by.isMain ? by.email : null,
      by.isMain ? new Date().toISOString() : null,
    ]
  );
  await upsertProfile(db, email, details.name, details.phone, by.email);
  await audit(db, by.email, by.isMain ? "staff_added" : "staff_requested", null, { email, role: input.role });
  return { ok: true, row: rows[0] };
}

/** Main admin only: approve or reject a pending request. */
export async function decideStaff(
  db: Db,
  email: string,
  decision: "approve" | "reject",
  by: Staff
): Promise<StaffRow | null> {
  if (!by.isMain) return null;
  const rows = await db.query<StaffRow>(
    `UPDATE staff SET status = $2, decided_by = $3, decided_at = now()
     WHERE email = $1 AND status = 'pending'
     RETURNING email, role, status, name, note, requested_by, requested_at, decided_by, decided_at, receives_leads,
       last_lead_at`,
    [norm(email), decision === "approve" ? "active" : "rejected", by.email]
  );
  if (rows[0]) await audit(db, by.email, decision === "approve" ? "staff_approved" : "staff_rejected", null, { email: norm(email) });
  return rows[0] ?? null;
}

/** Main admin only: remove access now (also signs them out everywhere). */
export async function removeStaff(db: Db, email: string, by: Staff): Promise<boolean> {
  if (!by.isMain) return false;
  const e = norm(email);
  const rows = await db.query(
    `UPDATE staff SET status = 'removed', decided_by = $2, decided_at = now()
     WHERE email = $1 AND status IN ('active', 'pending') RETURNING email`,
    [e, by.email]
  );
  if (!rows.length) return false;
  await db.query(`DELETE FROM admin_sessions WHERE email = $1`, [e]);
  await db.query(`DELETE FROM login_tokens WHERE email = $1`, [e]);
  await audit(db, by.email, "staff_removed", null, { email: e });
  return true;
}

/** Main admin only: switch an active member between admin and team. */
export async function changeRole(db: Db, email: string, role: string, by: Staff): Promise<boolean> {
  if (!by.isMain || (role !== "admin" && role !== "team")) return false;
  const rows = await db.query(`UPDATE staff SET role = $2, receives_leads = ($2 = 'team') WHERE email = $1 AND status = 'active' RETURNING email`, [
    norm(email),
    role,
  ]);
  if (rows.length) await audit(db, by.email, "staff_role_changed", null, { email: norm(email), role });
  return rows.length > 0;
}

export async function staffCounts(db: Db): Promise<{ active: number; pending: number }> {
  const rows = await db.query<{ status: string; n: number }>(
    `SELECT status, count(*)::int AS n FROM staff WHERE status IN ('active', 'pending') GROUP BY status`
  );
  const get = (s: string) => rows.find((r) => r.status === s)?.n ?? 0;
  return { active: get("active"), pending: get("pending") };
}

// ---------- Contact details ----------

/** Contact details for every address that has (or had) access, keyed by email. */
export async function people(db: Db): Promise<Map<string, Person>> {
  const rows = await db.query<{ email: string; name: string | null; phone: string | null }>(
    `SELECT e.email, COALESCE(p.name, s.name) AS name, p.phone
     FROM (SELECT email FROM staff UNION SELECT email FROM staff_profiles) e
     LEFT JOIN staff_profiles p ON p.email = e.email
     LEFT JOIN staff s ON s.email = e.email`
  );
  const map = new Map<string, Person>();
  for (const r of rows) map.set(r.email, { email: r.email, name: r.name ?? "", phone: r.phone ?? "" });
  for (const e of config.mainAdminEmails) if (!map.has(e)) map.set(e, { email: e, name: "", phone: "" });
  return map;
}

export async function personFor(db: Db, email: string): Promise<Person> {
  const e = norm(email);
  return (await people(db)).get(e) ?? { email: e, name: "", phone: "" };
}

/** "Priya Sharma" if we know the name, otherwise the email. */
export const nameOf = (p: Person | undefined, email: string): string => (p?.name ? p.name : email);

/** Update someone's name + phone: yourself, or anyone if you're a main admin. */
export async function setProfile(
  db: Db,
  email: string,
  input: { name: string; phone: string },
  by: Staff
): Promise<{ ok: true } | { ok: false; error: string }> {
  const e = norm(email);
  if (e !== by.email && !by.isMain) return { ok: false, error: "You can only change your own details." };
  if (!isMainAdmin(e) && !(await getStaffRow(db, e))) return { ok: false, error: "That person isn't on the team." };
  const details = checkDetails(input.name, input.phone);
  if ("error" in details) return { ok: false, error: details.error };
  await upsertProfile(db, e, details.name, details.phone, by.email);
  await db.query(`UPDATE staff SET name = $2 WHERE email = $1`, [e, details.name]);
  await audit(db, by.email, "staff_details_changed", null, { email: e });
  return { ok: true };
}

// ---------- Lead rotation ----------

/**
 * Picks who gets the next consultation request: the active member with "Gets new requests" on who
 * was given one longest ago (never → first). Returns null if nobody is in the rotation.
 */
export async function pickAssignee(db: Db): Promise<string | null> {
  const rows = await db.query<{ email: string }>(
    `UPDATE staff SET last_lead_at = now()
     WHERE email = (
       SELECT email FROM staff WHERE status = 'active' AND receives_leads
       ORDER BY last_lead_at ASC NULLS FIRST, requested_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED
     )
     RETURNING email`
  );
  return rows[0]?.email ?? null;
}

export async function rotationMembers(db: Db): Promise<string[]> {
  const rows = await db.query<{ email: string }>(
    `SELECT email FROM staff WHERE status = 'active' AND receives_leads ORDER BY last_lead_at ASC NULLS FIRST, requested_at ASC`
  );
  return rows.map((r) => r.email);
}

/** Any admin: turn "Gets new requests" on or off for an active member (it isn't an access change). */
export async function setReceivesLeads(db: Db, email: string, on: boolean, by: Staff): Promise<boolean> {
  if (by.role !== "admin") return false;
  const rows = await db.query(`UPDATE staff SET receives_leads = $2 WHERE email = $1 AND status = 'active' RETURNING email`, [
    norm(email),
    on,
  ]);
  if (rows.length) await audit(db, by.email, on ? "rotation_on" : "rotation_off", null, { email: norm(email) });
  return rows.length > 0;
}

/** Everyone a request can be assigned to: the main admin(s) and active members. */
export async function assignableStaff(db: Db): Promise<string[]> {
  const rows = await db.query<{ email: string }>(`SELECT email FROM staff WHERE status = 'active' ORDER BY email`);
  return uniqList([...config.mainAdminEmails, ...rows.map((r) => r.email)]);
}

const uniqList = (xs: string[]) => [...new Set(xs)];

// ---------- Who receives which emails ----------

const uniq = (xs: string[]) => [...new Set(xs)];

/** Blog approval emails and system alerts: main admins + active admins. */
export async function adminRecipients(db: Db): Promise<string[]> {
  const rows = await db.query<{ email: string }>(`SELECT email FROM staff WHERE status = 'active' AND role = 'admin'`);
  return uniq([...config.mainAdminEmails, ...rows.map((r) => r.email)]);
}
