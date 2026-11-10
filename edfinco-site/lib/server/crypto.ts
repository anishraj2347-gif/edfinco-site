// Small crypto helpers. Tokens are 256-bit random values; only their SHA-256 hashes are stored,
// so a database leak never reveals a usable login, review or worker token.
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time comparison of two strings (e.g. a bearer secret against the configured one). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) {
    // Still spend comparable time so length differences aren't trivially observable.
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export const uuid = (): string => randomUUID();

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const TOKEN_RE = /^[A-Za-z0-9_-]{40,64}$/;
