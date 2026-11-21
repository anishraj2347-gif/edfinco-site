// Anyone signed in: update your own name and phone number, or change your password.
import type { NextRequest } from "next/server";
import { guardStaffPost } from "@/lib/server/admin-guard";
import { checkLogin, setPassword } from "@/lib/server/auth";
import { audit } from "@/lib/server/audit";
import { allow } from "@/lib/server/rate-limit";
import { methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { setProfile } from "@/lib/server/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const g = await guardStaffPost(request);
  if (g instanceof Response) return g;
  const form = await readForm(request, 2_000);
  const fail = (m: string) => seeOther(`/admin/me?error=${encodeURIComponent(m)}`);
  if (form?.get("action") === "password") {
    if (!(await allow(g.db, `pw-change:${g.admin.email}`, 10, 3600))) return fail("Too many attempts. Try again in an hour.");
    if (!(await checkLogin(g.db, g.admin.email, form.get("current") ?? ""))) return fail("Your current password is wrong.");
    const next = form.get("password") ?? "";
    if (next !== (form.get("confirm") ?? "")) return fail("The new passwords don't match.");
    const err = await setPassword(g.db, g.admin.email, next);
    if (err) return fail(err);
    await audit(g.db, g.admin.email, "password_changed");
    return seeOther("/admin/me?msg=password");
  }
  const r = await setProfile(g.db, g.admin.email, { name: form?.get("name") ?? "", phone: form?.get("phone") ?? "" }, g.admin);
  return r.ok ? seeOther("/admin/me?msg=saved") : fail(r.error);
}

export const GET = () => methodNotAllowed("POST");
