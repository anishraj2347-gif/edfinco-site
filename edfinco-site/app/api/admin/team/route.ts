// Team & access. Any admin can ADD someone (name, email, phone; pending until approved) and switch
// "Gets new requests" on/off. Only a MAIN admin can approve, reject, remove, change roles or edit
// someone else's details — enforced here and again inside lib/server/staff.ts.
import type { NextRequest } from "next/server";
import { guardAdminPost } from "@/lib/server/admin-guard";
import { sendEmail } from "@/lib/server/email";
import { methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { sendToMainAdmins } from "@/lib/server/notify";
import { allow } from "@/lib/server/rate-limit";
import { addStaff, changeRole, decideStaff, personFor, removeStaff, setProfile, setReceivesLeads } from "@/lib/server/staff";
import { accessGrantedEmail, accessRequestEmail } from "@/lib/server/team-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const g = await guardAdminPost(request);
  if (g instanceof Response) return g;
  const { db, admin } = g;
  const form = await readForm(request, 4_000);
  const action = form?.get("action") ?? "";
  const email = (form?.get("email") ?? "").trim().toLowerCase();
  const ok = (m: string) => seeOther(`/admin/team?msg=${m}`);
  const fail = (m: string) => seeOther(`/admin/team?error=${encodeURIComponent(m)}`);

  if (action === "add") {
    if (!(await allow(db, `staff-add:${admin.email}`, 20, 86400))) return fail("Too many additions today. Try again tomorrow.");
    const r = await addStaff(
      db,
      {
        email,
        role: form?.get("role") ?? "",
        name: form?.get("name") ?? "",
        phone: form?.get("phone") ?? "",
        note: form?.get("note") ?? "",
      },
      admin
    );
    if (!r.ok) return fail(r.error);
    if (r.row.status === "pending") {
      await sendToMainAdmins(accessRequestEmail(await personFor(db, r.row.email), r.row.role, admin.email, r.row.note));
      return ok("requested");
    }
    await sendEmail({ to: [r.row.email], ...accessGrantedEmail(r.row.email, r.row.role) });
    return ok("added");
  }

  if (action === "rotation") {
    const on = form?.get("on") === "1";
    return (await setReceivesLeads(db, email, on, admin)) ? ok(on ? "rotation-on" : "rotation-off") : fail("Could not change that.");
  }

  if (!admin.isMain) return fail("Only a main admin can do that.");

  if (action === "details") {
    const r = await setProfile(db, email, { name: form?.get("name") ?? "", phone: form?.get("phone") ?? "" }, admin);
    return r.ok ? ok("details") : fail(r.error);
  }
  if (action === "approve" || action === "reject") {
    const row = await decideStaff(db, email, action, admin);
    if (!row) return fail("That request was already handled.");
    if (action === "approve") await sendEmail({ to: [row.email], ...accessGrantedEmail(row.email, row.role) });
    return ok(action === "approve" ? "approved" : "rejected");
  }
  if (action === "remove") {
    return (await removeStaff(db, email, admin)) ? ok("removed") : fail("That person doesn't have access.");
  }
  if (action === "role") {
    return (await changeRole(db, email, form?.get("role") ?? "", admin)) ? ok("role-changed") : fail("Could not change the role.");
  }
  return fail("Unknown action.");
}

export const GET = () => methodNotAllowed("POST");
