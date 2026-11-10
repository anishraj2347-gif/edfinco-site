// Gates for admin form POSTs: same-origin + a signed-in staff member with the right role.
// Return a Response to send back on failure, or the database + staff member on success.
import type { NextRequest } from "next/server";
import type { Db } from "./db";
import { getDb } from "./db";
import { getStaff } from "./auth";
import type { Staff } from "./staff";
import { isSameOrigin, json, seeOther } from "./http";

async function guard(request: NextRequest, adminOnly: boolean): Promise<{ db: Db; admin: Staff } | Response> {
  if (!isSameOrigin(request)) return json({ ok: false, error: "Forbidden." }, 403);
  const staff = await getStaff();
  if (!staff) return seeOther("/admin/login?error=signin");
  if (adminOnly && staff.role !== "admin") return json({ ok: false, error: "Admins only." }, 403);
  return { db: await getDb(), admin: staff };
}

/** Blog automation and settings: admins only. */
export function guardAdminPost(request: NextRequest) {
  return guard(request, true);
}

/** Consultation requests: admins and the team. */
export function guardStaffPost(request: NextRequest) {
  return guard(request, false);
}
