// Anyone signed in: update your own name and phone number.
import type { NextRequest } from "next/server";
import { guardStaffPost } from "@/lib/server/admin-guard";
import { methodNotAllowed, readForm, seeOther } from "@/lib/server/http";
import { setProfile } from "@/lib/server/staff";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  const g = await guardStaffPost(request);
  if (g instanceof Response) return g;
  const form = await readForm(request, 2_000);
  const r = await setProfile(g.db, g.admin.email, { name: form?.get("name") ?? "", phone: form?.get("phone") ?? "" }, g.admin);
  return seeOther(r.ok ? "/admin/me?msg=saved" : `/admin/me?error=${encodeURIComponent(r.error)}`);
}

export const GET = () => methodNotAllowed("POST");
