// Step 1 of the consultation form: contact details + consent to be contacted.
// The student has actively agreed ("I agree to be contacted about my enquiry") and was told that
// we may contact them even if they don't finish step 2 — so a step-1-only request is a consented
// lead. Same security posture as /api/consultation (same-origin, validation, limits, bot trap).
import type { NextRequest } from "next/server";
import { CONSULTATION } from "@/lib/content";
import { audit } from "@/lib/server/audit";
import { hashToken, newToken } from "@/lib/server/crypto";
import { getDb } from "@/lib/server/db";
import { clientIp, isSameOrigin, json, methodNotAllowed } from "@/lib/server/http";
import { isBot, parseContact, readJsonBody } from "@/lib/server/lead-validation";
import { newRef, startLead } from "@/lib/server/leads";
import { allow } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<Response> {
  if (!isSameOrigin(request)) return json({ ok: false, error: "Forbidden." }, 403);
  const body = await readJsonBody(request);
  if ("error" in body) return json({ ok: false, error: body.error }, body.status);
  const data = body.data;

  // Bot trap: same response shape, nothing stored.
  if (isBot(data)) return json({ ok: true, ref: newRef(), token: newToken() }, 200);

  const contact = parseContact(data);
  if (!contact) return json({ ok: false, error: "Please check your details and try again." }, 422);

  const db = await getDb();
  const okIp = await allow(db, `consult-start-ip:${hashToken(clientIp(request)).slice(0, 32)}`, 10, 3600);
  const okEmail = await allow(db, `consult-start-email:${hashToken(contact.email).slice(0, 32)}`, 6, 86400);
  if (!okIp || !okEmail) return json({ ok: false, error: "rate_limited" }, 429);

  const resume = typeof data.token === "string" ? data.token : null;
  const { lead, token, reused } = await startLead(db, { ...contact, consentText: CONSULTATION.form.consentLabel }, resume);
  if (!reused) await audit(db, "website", "lead_started", null, { ref: lead.ref });
  return json({ ok: true, ref: lead.ref, token }, 200);
}

export const GET = () => methodNotAllowed("POST");
