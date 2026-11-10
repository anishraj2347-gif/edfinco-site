---
name: edfinco-web
description: Build and refine the EdFinco marketing website (edfinco-site/, Next.js 15 App Router + TypeScript). Use for any work on the EdFinco site — pages, components, copy, styling, SEO, performance, accessibility, and secure-by-design hardening. Encodes the brand/claims rules, the security baseline (every nomad finding designed out), and the project conventions so the build stays compliant and consistent.
---

# EdFinco web build

The standards for building and improving the EdFinco site at `edfinco-site/`. EdFinco is an
**education-loan assistance platform / DSA for Indian students going abroad — NOT a lender.**
Source of truth for brand + claims: `brand/brand.md`. Security baseline: `edfinco-site/SECURITY.md`.

## 0. Before you touch anything
- Read `brand/brand.md` (claims rules) and `lib/content.ts` (all regulated copy lives there).
- All claims-sensitive wording goes in `lib/content.ts` ONLY — never hardcode a claim in a `.tsx`.
- Run from `edfinco-site/`. Node/Next are already installed; `npm audit` must stay at 0.

## 1. Claims rules (hard constraints — never violate)
NEVER write, in copy or code:
- "Guaranteed"/"guarantee" approval, or any promise of a loan or visa.
- "Cheapest", "lowest/best rate", "cheaper", "faster", "instant" — unless the owner supplies evidence.
- A **named lender** (ICICI, Avanse, Prodigy, etc.) or a **specific interest rate / amount** — the
  brand forbids it. Use generic categories: "public & private banks", "NBFCs", "international private lenders".
- A **fabricated testimonial, stat, or performance number.** ASCI bans fake testimonials and deepfakes
  even when labelled. Only use numbers that describe the offering (e.g. "8 destinations"), never outcomes.

ALWAYS:
- Keep "EdFinco is not a lender" prominent; lender decides eligibility/amount/pricing/collateral/disbursement.
- "No collateral does not mean guaranteed approval" wherever collateral-free is mentioned.
- On any Maya content: "Maya is fictional"; on any AI-made media: "Created using AI".
- Leave owner-action items as visible `{/* Owner action required: ... */}` comments (legal entity name,
  exact fee wording, lender disclosures) rather than inventing values.

## 2. Nomadcredit-style structure (the model to match)
Mirror nomadcredit.com's section rhythm, adapted to EdFinco's compliant copy:
hero (headline + feature chips + CTA, "not a lender" badge) → trust strip → stats strip (offering facts,
not outcomes) → "lenders, one platform" grid (generic categories, NO names/rates) → advisory callout
("Confused? Talk to an advisor — free") → how-it-works 4 steps → collateral explainer → destinations grid →
"Why EdFinco" comparison table → straight-facts (lender decides) → final CTA. A floating "Book a free
consultation" button is on brand. Do NOT copy nomad's named-lender rate cards or testimonial wall.

## 3. Project conventions
- Next.js 15 App Router, TypeScript, React Server Components by default; `"use client"` only when needed
  (forms, interactivity). Font: **Lexend**, self-hosted via `next/font`.
- Styling: CSS Modules per route/component + design tokens in `app/globals.css` (`var(--navy)`,
  `var(--blue)`, `var(--teal)`, `var(--grad-brand)`, radius/shadow tokens). Reuse utility classes
  (`.container`, `.section`, `.card`, `.grid grid-N`, `.btn`, `.ticks`, `.eyebrow`, `.badge`, `.notice`).
- Colors: navy `#0A1A5C`, blue `#0F5BF0`, teal `#00BFA6`, paper `#FFF8E7`, ink `#111827`.
- Content imported from `@/lib/content.ts`. Add new copy there, typed, with a comment on any claim.

## 4. Secure-by-design checklist (keep every nomad finding designed out)
- Strict CSP with per-request nonce via `middleware.ts`; no `unsafe-inline` scripts.
- All security headers + `poweredByHeader: false` in `next.config.mjs` (HSTS, X-Frame-Options/frame-ancestors,
  X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- Lead/consultation API: same-origin, write-only, **no wildcard CORS**, server-side validation, no secrets
  to the client, no reflected input. Never add a client-exposed token or key.
- No inline event handlers that need `unsafe-inline`; no `dangerouslySetInnerHTML` with unsanitized input.
- Keep `npm audit` at 0; pin/override to stay off known CVEs. Don't introduce heavy deps for trivial needs.

## 5. Quality bar ("make it perfect")
- **Accessibility:** semantic landmarks, one `<h1>`/page, labelled form controls, visible focus states,
  alt text, colour contrast ≥ 4.5:1, keyboard-navigable, `prefers-reduced-motion` respected.
- **Responsive:** works 320px → wide; no horizontal scroll; tap targets ≥ 44px.
- **SEO:** per-page `metadata` (title/description/canonical/OG), `robots.ts`, `sitemap.ts`, descriptive links.
- **Perf:** `next/image` with width/height, system/`next/font` only, minimal client JS, no layout shift.
- **Consistency:** reuse tokens/utilities; don't fork near-duplicate styles.

## 6. Verify before done
```
cd edfinco-site
npm run build      # must pass, no type errors
npm audit          # must be 0 vulnerabilities
npm start          # smoke-test pages + the consultation API + response headers
```
Report what you changed, that the build/audit passed, and list any remaining `Owner action required` items.
Never claim a page is done without a passing build.
