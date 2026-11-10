---
name: edfinco-audit
description: Pre-launch QA & audit checklist for the EdFinco website (Next.js 15 study-abroad loan-assistance site). Use to audit a page or the whole site before calling it "done" — security hardening (every nomad finding designed out), accessibility (WCAG 2.2 AA), SEO, performance/Core Web Vitals, responsiveness, broken links, and build health. Read-only methodology: produces a prioritized pass/fail report with file:line evidence and fixes. Pairs with brand-compliance (copy/claims) and design-reviewer (visual/UX).
---

# EdFinco launch audit

The gate every page passes before it ships. Read-only — audit and report; hand fixes to web-engineer.
Project: `edfinco-site/` (Next.js 15 App Router + TS). Security baseline: `edfinco-site/SECURITY.md`.
Brand/claims: `brand/brand.md`.

## Run order
```
cd edfinco-site
npm run build      # BLOCKER if it fails or has type errors
npm audit          # BLOCKER if > 0 vulnerabilities
```
Then static review (Read/Grep/Glob) + live checks if a server is up (headers, routes).

## 1. Security (blocker on any regression — keep every nomad finding designed out)
- [ ] `middleware.ts` sets a strict CSP with a **per-request nonce**; no `unsafe-inline` for scripts.
- [ ] `next.config.mjs` sets HSTS, X-Frame-Options/`frame-ancestors`, X-Content-Type-Options,
      Referrer-Policy, Permissions-Policy, and `poweredByHeader: false`.
- [ ] Lead/consultation API: same-origin, **write-only**, no wildcard CORS, server-side validation,
      no secret sent to client, no reflected/echoed input.
- [ ] No `dangerouslySetInnerHTML` with unsanitized input; no client-exposed tokens/keys; no inline
      event handlers requiring `unsafe-inline`.
- [ ] `npm audit` == 0; deps pinned/overridden off known CVEs; no heavy dep for a trivial need.

## 2. Compliance sanity (defer deep copy audit to brand-compliance, but flag)
- [ ] No "guaranteed", "cheapest/lowest/best rate", "cheaper/faster/instant", named lenders, specific
      rates, or fabricated testimonials/outcome stats anywhere rendered.
- [ ] "EdFinco is not a lender" present and prominent; collateral-free caveat present where relevant.
- [ ] Claims live in `lib/content.ts` with source notes; `Owner action required` items still visible/tracked.

## 3. Accessibility (WCAG 2.2 AA)
- [ ] Semantic landmarks (`header/nav/main/footer`), exactly one `<h1>` per page, logical heading order.
- [ ] All form controls labelled; visible focus states; full keyboard path; skip-to-content.
- [ ] Meaningful `alt` text; decorative images `alt=""`. Contrast ≥ 4.5:1 (3:1 large text/UI).
- [ ] `prefers-reduced-motion` respected; no keyboard traps; tap targets ≥ 44px.

## 4. SEO
- [ ] Per-page `metadata`: unique title (≤ ~60), description (≤ ~155), canonical, Open Graph/Twitter.
- [ ] `robots.ts` and `sitemap.ts` present and correct; no accidental `noindex`.
- [ ] Descriptive link text, structured FAQ where used, no broken internal links.

## 5. Performance / Core Web Vitals
- [ ] Images via `next/image` with width/height (no CLS); fonts via `next/font` (no FOIT/extra requests).
- [ ] Minimal client JS (`"use client"` only where needed); no large unused deps; code-split heavy bits.
- [ ] No obvious LCP/INP/CLS risks; lazy-load below-the-fold media.

## 6. Responsive & cross-device
- [ ] 320px → wide with no horizontal scroll; layouts reflow, not shrink-to-unreadable.
- [ ] Nav/menu works on mobile; floating CTA doesn't cover content or trap focus.

## 7. Report format
Prioritize: **Blocker** (security/build/legal) → **High** (a11y/SEO) → **Medium** (perf/consistency)
→ **Low** (polish). Each finding: severity · `file:line` · problem · why it matters · the fix.
End with a one-line verdict: **launch-ready** or **not launch-ready** (+ the blockers). Never pass a
failing build or a security regression.
