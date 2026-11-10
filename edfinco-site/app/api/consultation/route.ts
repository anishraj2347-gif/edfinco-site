// app/api/consultation/route.ts
// Secure, same-origin, WRITE-ONLY lead-capture endpoint for the /consultation form.
//
// Two ways in:
//  - Step 2 of the two-step form: {token, destination, studyLevel, intake, coBorrower, message}
//    completes the request started at /api/consultation/start (token = one-time, hashed at rest).
//  - The original one-step payload (all fields) still works and creates a complete request.
//
// Security posture (keeps every nomad finding designed out):
//  - POST only; same-origin only (no CORS, Origin never reflected); body size-capped before
//    parsing; every field validated server-side; honeypot gets the same response shape; limits per
//    hashed IP and per email; no IP stored; only a generic ok + reference is returned.
//
// What happens next: the team is emailed at once (Call / WhatsApp / Email buttons, Reply-To = the
// student), the student gets a confirmation with their reference, the request is copied to the
// Google Sheet ("Submitted" tab), and the team works it in /admin/leads.
import { after, type NextRequest } from "next/server";
import { CONSULTATION } from "@/lib/content";
import { audit } from "@/lib/server/audit";
import { hashToken } from "@/lib/server/crypto";
import { getDb } from "@/lib/server/db";
import { clientIp, isSameOrigin, json } from "@/lib/server/http";
import { isBot, parseContact, parsePlan, readJsonBody } from "@/lib/server/lead-validation";
import { completeLead, createLead, newRef } from "@/lib/server/leads";
import { alertTeam } from "@/lib/server/lead-workflow";
import { allow } from "@/lib/server/rate-limit";

// This route handles untrusted input and must always run server-side, never be cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  // 1. Same-origin gate.
  if (!isSameOrigin(request)) return json({ ok: false, error: "Forbidden." }, 403);

  // 2–3. Content type + size guard, defensive parse.
  const body = await readJsonBody(request);
  if ("error" in body) return json({ ok: false, error: body.error }, body.status);
  const data = body.data;

  // 4. Honeypot: bots get the same response shape, no lead.
  if (isBot(data)) return json({ ok: true, ref: newRef() }, 200);

  // 5. Validate the study plans (both paths need them).
  const plan = parsePlan(data);
  if (!plan) return json({ ok: false, error: "Please check your details and try again." }, 422);

  const db = await getDb();
  const okIp = await allow(db, `consult-ip:${hashToken(clientIp(request)).slice(0, 32)}`, 6, 3600);
  if (!okIp) return json({ ok: false, error: "rate_limited" }, 429);

  // 6a. Step 2 of the two-step form.
  if (typeof data.token === "string") {
    const lead = await completeLead(db, data.token, plan);
    if (!lead) return json({ ok: false, error: "expired" }, 410);
    await audit(db, "website", "lead_completed", null, { ref: lead.ref });
    after(() => alertTeam(db, lead).catch((err) => console.error("[consultation] team alert failed", err)));
    return json({ ok: true, ref: lead.ref }, 200);
  }

  // 6b. One-step payload (everything at once).
  const contact = parseContact(data);
  if (!contact) return json({ ok: false, error: "Please check your details and try again." }, 422);
  if (!(await allow(db, `consult-email:${hashToken(contact.email).slice(0, 32)}`, 4, 86400))) {
    return json({ ok: false, error: "rate_limited" }, 429);
  }
  const { lead, duplicate } = await createLead(db, {
    ...contact,
    ...plan,
    consentText: CONSULTATION.form.consentLabel,
  });
  await audit(db, "website", duplicate ? "lead_resubmitted" : "lead_received", null, { ref: lead.ref });
  if (!duplicate) {
    after(() => alertTeam(db, lead).catch((err) => console.error("[consultation] team alert failed", err)));
  }

  // 7. Generic success with the reference only — no input reflected, no secrets.
  return json({ ok: true, ref: lead.ref }, 200);
}

// Explicitly refuse non-POST methods with an Allow header.
function methodNotAllowed(): Response {
  return new Response(JSON.stringify({ ok: false, error: "Method not allowed." }), {
    status: 405,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Allow: "POST",
      "Cache-Control": "no-store",
    },
  });
}

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const HEAD = methodNotAllowed;
export const OPTIONS = methodNotAllowed;
