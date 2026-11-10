---
name: edfinco-marketing
description: Marketing, messaging, conversion copywriting and SEO content for the EdFinco website — a study-abroad education-loan assistance platform (DSA, NOT a lender) for Indian students, modelled on nomadcredit.com. Use for page copy, headlines, CTAs, value props, information architecture, trust-building, and SEO (titles/descriptions/keywords/content). Encodes the brand voice and the ASCI/brand claims rules so every word is compliant and persuasive.
---

# EdFinco marketing & copy

Standards for what the EdFinco site says and how it converts. EdFinco is an **education-loan
assistance platform / DSA for Indian students going abroad — NOT a lender.** Source of truth for
brand, voice and claims: `brand/brand.md`. All regulated copy ships through `edfinco-site/lib/content.ts`.

## 0. Before writing
- Read `brand/brand.md` (voice + claims rules) and the current `lib/content.ts` (don't contradict live copy).
- Know the goal of the page and the one action you want the visitor to take.

## 1. Positioning (one sentence)
"EdFinco helps Indian students and their families find and compare education-loan options across a
network of banks, NBFCs and international private lenders — free guidance, you choose, the lender decides."
The site must never read as a lender. Lead with clarity and trust, not hype.

## 2. Voice
Direct, warm, honest. Talk to "you". Short lines, plain English. Address student AND parent. "Papa"/
"beta" only where natural. No jargon, no AI-tells (no "In today's fast-paced world", "unlock",
"elevate", "seamless", em-dash-stuffed hype, listicle padding). Confident, calm, specific.

## 3. Claims rules (hard constraints — identical to brand.md)
NEVER: "guaranteed"/promise of loan or visa; "cheapest/lowest/best rate", "cheaper/faster/instant"
(without owner evidence); named lenders; specific rates/amounts; fabricated testimonials/stats/outcomes.
ALWAYS: "EdFinco is not a lender" prominent; "lender decides eligibility/amount/pricing/collateral/
disbursement"; "No collateral does not mean guaranteed approval" near any collateral-free mention.
Generic categories only ("public & private banks", "NBFCs", "international private lenders").
Unconfirmed facts → `Owner action required: ...`, never invented.

## 4. Message architecture (nomadcredit-style, compliant)
Give each section a single job and lean only on real, offering-level proof:
1. **Hero** — outcome-led headline (the dream + the path to fund it) + subhead + primary CTA
   ("Book your free consultation") + a quiet "Not a lender — we help you compare" line.
2. **Trust strip** — what's reassuring and TRUE (free guidance, you're in control, no spam).
3. **Stats strip** — offering facts only (e.g. "8 study destinations", "banks, NBFCs & international
   lenders in one place"). NEVER outcome numbers (approval %, amounts disbursed, students funded)
   unless the owner supplies a source.
4. **One platform, many lenders** — generic categories, the value of comparing in one place.
5. **Advisory callout** — "Confused about collateral or co-signers? Talk to an advisor — free."
6. **How it works** — 3–4 honest steps (share your plan → we map options → you compare → lender decides).
7. **Collateral explainer** — collateral vs collateral-free, with the mandatory caveat.
8. **Destinations** — the 8 countries, each a short reason-to-study line.
9. **Why EdFinco** — benefit comparison (guidance vs going it alone), no competitor names.
10. **Straight facts / FAQ** — set honest expectations; answer the parent's hard questions.
11. **Final CTA** — restate the free consultation, low-pressure.

## 5. CTAs
Primary: "Book your free consultation" (free, no obligation). Secondary: "See how it works",
"Explore destinations". Make the cost (free) and the control (you choose) explicit. One primary CTA per screen.

## 6. SEO
- Intent-matched titles (≤ ~60 chars) and descriptions (≤ ~155) per page; one clear `<h1>`.
- Target real student queries: "education loan for abroad studies", "study abroad loan without
  collateral", "<country> student loan for Indian students", "co-signer / co-borrower education loan".
- Compliant content depth: genuine guides on collateral, co-borrowers, documents, timelines — never
  keyword-stuffed, never a claim without a source. Descriptive internal links, alt text, structured FAQ.

## 7. Deliverable shape
Copy comes back section-keyed and ready for `lib/content.ts` (typed), each factual line carrying a
source note, with SEO meta and any `Owner action required` items listed. brand-compliance audits
before launch; web-engineer wires it in.
