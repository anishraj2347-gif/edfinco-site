// HTTP helpers for the admin, review and automation route handlers.
//
// Security posture (same as app/api/consultation/route.ts — every nomad finding stays designed out):
//  - Browser form posts must be same-origin (Origin host === Host, Sec-Fetch-Site same-origin).
//  - No CORS headers are ever sent and the Origin is never reflected.
//  - Bodies are size-capped before parsing; responses are no-store and never echo input.
import type { NextRequest } from "next/server";
import { config } from "./config";

const NO_STORE = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...NO_STORE },
  });
}

/** 303 See Other to a same-site path (Post/Redirect/Get). Only relative paths are accepted. */
export function seeOther(path: string): Response {
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return new Response(null, { status: 303, headers: { Location: safe, ...NO_STORE } });
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const site = request.headers.get("sec-fetch-site");
  // Browsers send "Origin: null" for form posts from a page whose referrer policy hides the
  // referrer. Accept that ONLY when the browser itself (Sec-Fetch-Site can't be set by page
  // scripts) says the request came from this same site; a cross-site post is still refused.
  if (origin === "null") return site === "same-origin";
  if (!origin || !host) return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const appHost = new URL(config.appUrl).host;
  if (originHost !== host && originHost !== appHost) return false;
  if (site && site !== "same-origin") return false;
  return true;
}

/**
 * The visitor's IP, used only to key rate limits, so it must come from a header the hosting edge
 * sets itself: a value the visitor controls would let one person rotate fake addresses past every
 * per-IP limit. Render runs behind Cloudflare, which always sets CF-Connecting-IP to the real
 * visitor, while Render keeps any X-Forwarded-For the visitor sent at the front of that list.
 * Vercel overwrites X-Forwarded-For, so its first entry is the visitor there.
 */
export function clientIp(request: NextRequest): string {
  if (config.onRender) {
    const cf = request.headers.get("cf-connecting-ip");
    if (cf) return cf.trim().slice(0, 64);
  }
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return (request.headers.get("x-real-ip") ?? "unknown").slice(0, 64);
}

export function bearer(request: NextRequest): string | null {
  const h = request.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer\s+([A-Za-z0-9._~+/=-]{16,512})$/);
  return m ? m[1] : null;
}

/** Reads a body as text with a hard size cap (null if too large). */
export async function readCapped(request: NextRequest, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  const text = await request.text();
  return Buffer.byteLength(text, "utf8") > maxBytes ? null : text;
}

/** Parses an application/x-www-form-urlencoded body (size-capped). */
export async function readForm(request: NextRequest, maxBytes = 16_000): Promise<URLSearchParams | null> {
  const type = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!type.startsWith("application/x-www-form-urlencoded")) return null;
  const text = await readCapped(request, maxBytes);
  return text === null ? null : new URLSearchParams(text);
}

export function methodNotAllowed(allow: string): Response {
  return new Response(JSON.stringify({ ok: false, error: "Method not allowed." }), {
    status: 405,
    headers: { "Content-Type": "application/json; charset=utf-8", Allow: allow, ...NO_STORE },
  });
}
