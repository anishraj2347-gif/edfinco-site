// Shared server-side validation for the consultation form (both steps).
import type { NextRequest } from "next/server";
import { CONSULTATION_DESTINATIONS, CONSULTATION_STUDY_LEVELS } from "@/lib/content";

export const LIMITS = {
  name: 100,
  email: 254,
  phone: 20,
  intake: 60,
  coBorrower: 60,
  message: 2000,
} as const;

export const MAX_BODY_BYTES = 10_000;

// Conservative, non-catastrophic checks (no ReDoS); the team verifies details on the call.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-.\s]{6,20}$/;

const isString = (v: unknown): v is string => typeof v === "string";

/** Strips control characters (newlines kept only where allowed) and trims. */
export function clean(v: unknown, keepNewlines = false): string {
  return isString(v)
    ? v
        .replace(keepNewlines ? /[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, "")
        .replace(/\r\n?/g, "\n")
        .trim()
    : "";
}

/** Reads a small JSON object body, or returns an error Response-like tuple. */
export async function readJsonBody(
  request: NextRequest
): Promise<{ data: Record<string, unknown> } | { error: string; status: number }> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return { error: "Unsupported media type.", status: 415 };
  }
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return { error: "Payload too large.", status: 413 };
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return { error: "Payload too large.", status: 413 };
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { error: "Invalid request.", status: 400 };
    }
    return { data: parsed as Record<string, unknown> };
  } catch {
    return { error: "Invalid request.", status: 400 };
  }
}

export const isBot = (data: Record<string, unknown>): boolean => isString(data.company) && data.company.trim() !== "";

export function parseContact(data: Record<string, unknown>): { studentName: string; email: string; phone: string } | null {
  const studentName = clean(data.studentName);
  const email = clean(data.email).toLowerCase();
  const phone = clean(data.phone);
  const ok =
    studentName.length >= 1 &&
    studentName.length <= LIMITS.name &&
    email.length >= 1 &&
    email.length <= LIMITS.email &&
    EMAIL_RE.test(email) &&
    phone.length >= 1 &&
    phone.length <= LIMITS.phone &&
    PHONE_RE.test(phone) &&
    data.consent === true;
  return ok ? { studentName, email, phone } : null;
}

export function parsePlan(
  data: Record<string, unknown>
): { destination: string; studyLevel: string; intake: string; coBorrower: string; message: string } | null {
  const destination = clean(data.destination);
  const studyLevel = clean(data.studyLevel);
  const intake = clean(data.intake);
  const coBorrower = clean(data.coBorrower);
  const message = clean(data.message, true);
  const ok =
    CONSULTATION_DESTINATIONS.includes(destination) &&
    CONSULTATION_STUDY_LEVELS.includes(studyLevel) &&
    intake.length >= 1 &&
    intake.length <= LIMITS.intake &&
    coBorrower.length <= LIMITS.coBorrower &&
    message.length <= LIMITS.message;
  return ok ? { destination, studyLevel, intake, coBorrower, message } : null;
}
