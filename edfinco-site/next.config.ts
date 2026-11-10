import type { NextConfig } from "next";

// Static, per-response security headers. The Content-Security-Policy is set per-request in proxy.ts
// (it needs a fresh nonce each request), so it is intentionally NOT duplicated here.
// NOTE: nonce-based CSP requires dynamic rendering, which is incompatible with Partial Prerendering,
// so `cacheComponents`/`partialPrefetching` are intentionally not enabled.
const securityHeaders = [
  // Force HTTPS for 2 years incl. subdomains; eligible for browser preload lists.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Defence-in-depth clickjacking guard (CSP frame-ancestors 'none' is the primary control).
  { key: "X-Frame-Options", value: "DENY" },
  // Stop MIME sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs to third parties.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Deny powerful features the site does not use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  },
  // Isolate cross-origin: no cross-origin resources unless explicitly allowed.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig: NextConfig = {
  // Remove the X-Powered-By: Next.js fingerprint.
  poweredByHeader: false,
  // Database drivers run as plain Node modules (PGlite ships WASM; it is only used in local dev).
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  // Blog posts live in the database. On first run lib/server/seed.ts imports the launch posts and
  // the topic backlog from content/blog/*.md — whichever route starts first, so every server
  // function ships those files.
  outputFileTracingIncludes: {
    "/*": ["./content/blog/*.md"],
    "/**": ["./content/blog/*.md"],
  },
  images: {
    // Next 16 requires explicitly whitelisting any non-default quality used via `quality={...}`.
    // All images are same-origin (served by the built-in optimizer); no remote hosts are added.
    qualities: [75, 85],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
