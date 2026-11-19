// proxy.ts  (Next.js 16 renamed `middleware` -> `proxy`; see node_modules/next/dist/docs
// /01-app/03-api-reference/03-file-conventions/proxy.md and .../02-guides/content-security-policy.md)
//
// Security baseline: a per-request CSP nonce. Scripts are strict (nonce + strict-dynamic, NO
// 'unsafe-inline') so injected/XSS scripts cannot run. style-src keeps 'unsafe-inline' because
// Next.js/React and inline SVG emit inline styles; this is the standard Next.js strict-CSP posture
// and does not weaken script protection. Static per-response security headers live in next.config.ts.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  // Only ask the browser to upgrade subresources when the page itself was served over HTTPS
  // (directly or behind a TLS-terminating proxy). On plain HTTP (e.g. http://<ip>:3000) the
  // directive rewrites every CSS/JS URL to https:// on a port with no TLS, so nothing loads.
  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto")?.split(",")[0].trim() === "https";

  const csp = [
    `default-src 'self'`,
    // 'unsafe-eval' is required ONLY in dev (React uses eval for debugging); never in production.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isHttps ? [`upgrade-insecure-requests`] : []),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Run on all pages except API, static assets, image optimizer and favicon; skip prefetches
      // (they don't render HTML and don't need a fresh nonce).
      source: "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
