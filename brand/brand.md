# EdFinco brand and content rules

## Who EdFinco is
- Education-loan assistance/DSA platform for Indian students going abroad. **EdFinco is not the lender.**
- Helps students explore options through a network of banks, NBFCs and international private lenders.
- Destinations listed on the site: USA, Canada, UK, Germany, Australia, Ireland, Singapore, UAE (Dubai).
- Website: www.edfinco.com. Email: hello@edfinco.com. Instagram: @edfinco_101.
- Tagline: "Your Dreams, Funded!"
- Call to action: "Book your free consultation" (link in bio).

## Audience
Indian students planning a Bachelor's, Master's, MBA or MS abroad, and the parents who will co-borrow. Parents often decide, so every post should make sense to a parent too.

## Look
- Colours from the logo: navy `#0A1A5C`, blue `#0F5BF0`, teal `#00BFA6`.
- Supporting colours: paper `#FFF8E7`, ink `#111827`.
- Headings: Bitter. Body: Montserrat.
- Carousel size: 1080 x 1350. Reel size: 1080 x 1920.
- All words on a slide or reel are rendered as real type by the pipeline. Never ask an image or video model to draw words, numbers or logos.

## Voice
Direct, warm and honest. Talks to "you". Uses short lines and plain English, with "Papa" and "beta" where natural. Follow the AI-tell rules in `Skills/social/SKILL.md`.

## Series: Maya's Study Abroad Diaries
Comic-style story series. Episode 1 "The Dream & The Debt" and the Episode 2 teaser are already live. Style reference: `brand/maya-style-reference.jpg`.

| Character | Description for image and video prompts |
|---|---|
| Maya | Indian woman, about 22, long wavy dark brown hair, warm brown eyes, small gold hoop earrings, soft pink sweater. Dreams of a postgraduate degree in London. |
| Papa | Indian man in his mid 50s, short grey hair, grey moustache, rectangular glasses, navy polo shirt. Careful, loving, asks hard questions. |

Maya is fictional. She must never appear as a real customer, and a story must never imply she received a loan through EdFinco.

## Claims rules
Every number or factual claim needs a source in the post's `claims` list.

**Approved wording**
- Eligibility, sanction amount, pricing, fees, collateral requirements and disbursement are decided by the lender.
- Some lenders may offer collateral-free options to students who meet their eligibility criteria.
- No collateral does not mean guaranteed approval.
- Lenders can look at academic background, university, course, future employment prospects and the co-borrower's financial standing.

**Never say**
- Guaranteed approval, or anything that promises a loan or a visa.
- "Cheaper", "lowest rate", "best rate", "faster" or "instant" unless the user supplies evidence.
- Named lenders, specific rates or RBI approval unless the user confirms them.

**Mandatory on every post**
- Disclaimer in the caption (see `pipeline/rules.mjs`).
- "Maya is fictional" on any Maya post.
- "Created using AI" on any post with AI-made images, video or voice, plus Instagram's AI label at upload (`is_ai_generated`).
- ASCI bans fabricated testimonials and deepfakes even when labelled.

## Items for the owner to fix
These are on the live site and profile and could cause trouble with lenders or regulators.
1. The Instagram bio says "Faster & Cheaper" with no evidence shown.
2. The blog says "if you can't get loan via us, then you can't get it from anywhere else!" This conflicts with "We cannot promise you a loan."
3. The blog contains leftover AI text: "Your source material also highlights...".
4. The site says "at no extra cost" and also mentions a 1% to 2% processing fee. Make clear who charges what.
5. The site does not show a legal entity name or partner lenders. Multi-lender platforms may have disclosure duties, so please confirm with your lender partners or a lawyer. (Legal name confirmed by the owner on 2026-11-10: "EdFinco". The new website footer shows it.)
