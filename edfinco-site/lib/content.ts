// lib/content.ts
// SINGLE SOURCE OF TRUTH for all regulated / claims-sensitive copy on the EdFinco site.
// Rules (brand/brand.md): EdFinco is NOT a lender. Never say guaranteed / cheaper / faster /
// instant / best / lowest / named lenders / specific rates / outcome stats / fabricated testimonials.
// Numbers here describe the OFFERING only (e.g. "8 destinations"), never outcomes.
// Any factual line carries a source comment; unconfirmed values are left as "Owner action required".
// Copy is lifted verbatim from docs/homepage-spec.md (v1, compliance-approved).

export interface CtaLink {
  label: string;
  href: string;
}

export interface TrustItem {
  title: string;
  body: string;
}

export interface Stat {
  // `value` is an offering fact, never an outcome. Source: docs/homepage-spec.md §3.
  value: string;
  label: string;
}

export interface LenderCategory {
  name: string;
  body: string;
}

export interface Step {
  title: string;
  body: string;
}

export interface Service {
  title: string;
  body: string;
}

export interface CollateralCard {
  title: string;
  body: string;
}

export interface Destination {
  // `image` is a real landmark photo (public/photos/dest/*, Pexels — see public/photos/CREDITS.md). The country NAME below it is the
  // real text label — never rely on the image to convey the name. `alt` carries no claims.
  image: { src: string; alt: string };
  name: string;
  reason: string;
}

export interface CompareRow {
  topic: string;
  withEdfinco: string;
  onYourOwn: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface Section {
  eyebrow?: string;
  heading: string;
  subhead?: string;
}

export interface SiteInfo {
  name: string;
  tagline: string;
  url: string;
  email: string;
  instagram: string;
  instagramUrl: string;
  // Registered legal name (owner confirmed 2026-11-10), shown in the footer copyright.
  legalEntity: string | null;
}

export const SITE: SiteInfo = {
  name: "EdFinco",
  tagline: "Your Dreams, Funded!", // Source: brand/brand.md (tagline)
  url: "https://www.edfinco.com",
  email: "hello@edfinco.com", // Source: brand/brand.md
  instagram: "@edfinco_101", // Source: brand/brand.md
  instagramUrl: "https://www.instagram.com/edfinco_101/",
  legalEntity: "EdFinco", // Owner confirmed 2026-11-10: the registered legal name is "EdFinco".
};

export const SEO = {
  title: "EdFinco — Education Loans for Studying Abroad", // ≤60 chars. Source: spec SEO meta.
  description:
    "Compare education-loan options for studying abroad across banks, NBFCs and international lenders. Free guidance — you choose, the lender decides.", // ≤155 chars.
  canonical: "https://www.edfinco.com/",
  ogTitle: "EdFinco — Education Loans for Studying Abroad",
  ogDescription:
    "Free guidance for Indian students going abroad. Compare education-loan options across banks, NBFCs and international lenders — you choose, the lender decides.",
};

// Primary consultation CTA target. A real /consultation route can replace this later.
export const CONSULT_HREF = "/consultation";

export interface HomeContent {
  announcement: string;
  nav: CtaLink[];
  primaryCta: CtaLink;

  hero: {
    eyebrow: string;
    headlineLine1: string;
    headlineLine2: string;
    tagline: string; // Real client tagline — sub-line under the H1 (does not replace the H1).
    subhead: string;
    body: string;
    notALenderBadge: string;
    chips: string[];
    ctaPrimary: CtaLink;
    ctaSecondary: CtaLink;
  };

  trust: {
    heading: string;
    items: TrustItem[];
  };

  stats: Stat[];
  // Non-committal funding-gap line shown near the stats (we estimate; the lender decides figures).
  fundingGapNote: string;

  platform: {
    section: Section;
    categories: LenderCategory[];
    lenderDecidesLine: string; // Mandatory compliance line.
    cta: CtaLink;
  };

  advisory: {
    eyebrow: string;
    heading: string;
    body: string;
    ctaPrimary: CtaLink;
    ctaSecondary: CtaLink;
  };

  howItWorks: {
    section: Section;
    steps: Step[];
    cta: CtaLink;
  };

  helpWith: {
    section: Section;
    services: Service[];
    cta: CtaLink;
  };

  collateral: {
    section: Section;
    cards: CollateralCard[];
    caveat: string; // MANDATORY wherever collateral-free is mentioned.
    cta: CtaLink;
  };

  destinations: {
    section: Section;
    items: Destination[];
    cta: CtaLink;
  };

  why: {
    section: Section;
    columns: { withEdfinco: string; onYourOwn: string };
    rows: CompareRow[];
    notALenderLine: string; // Compliance spine.
    cta: CtaLink;
  };

  faq: {
    eyebrow: string;
    heading: string;
    items: FaqItem[];
    cta: CtaLink;
  };

  finalCta: {
    eyebrow: string;
    heading: string;
    subhead: string;
    reassurance: string;
    notALenderLine: string; // Compliance spine.
    ctaPrimary: CtaLink;
    ctaSecondary: CtaLink;
  };

  footerDisclaimer: string; // Compliance spine (site-wide).
}

export const HOME: HomeContent = {
  announcement: `Free, no-obligation guidance for Indian students going abroad. Your Dreams, Funded!`,

  // Root-relative anchors (leading `/`) so in-page nav works from any route, e.g. /consultation.
  nav: [
    { label: `How it works`, href: `/#how-it-works` },
    { label: `Lenders`, href: `/#lenders` },
    { label: `Collateral`, href: `/#collateral` },
    { label: `Destinations`, href: `/#destinations` },
    { label: `FAQ`, href: `/#faq` },
    { label: `Blog`, href: `/blog` },
  ],

  primaryCta: { label: `Book a free consultation`, href: CONSULT_HREF },

  hero: {
    eyebrow: `For Indian students going abroad`,
    headlineLine1: `Study abroad.`,
    headlineLine2: `Fund it with confidence.`,
    // Real client tagline (edfinco.com/home). Sub-line only — the H1 above stays the compliant headline.
    tagline: `Your Dream University. Your Funding Plan. Your Future.`,
    subhead: `EdFinco helps you find and compare education-loan options across a network of banks, NBFCs and international private lenders. Free guidance. You choose. The lender decides.`,
    body: `Whether it's a Bachelor's, Master's, MBA or MS, we help you and your family understand your options — before you commit to anything.`,
    // Compliance spine location 1 of 5.
    notALenderBadge: `EdFinco is not a lender. We help you compare options and apply — we never approve or fund loans ourselves.`,
    chips: [
      `Banks, NBFCs & international lenders in one place`,
      `Free, no-obligation guidance`,
      `You stay in control of every decision`,
    ],
    ctaPrimary: { label: `Book your free consultation`, href: CONSULT_HREF },
    ctaSecondary: { label: `See how it works`, href: `#how-it-works` },
  },

  trust: {
    heading: `Honest help, no pressure`,
    items: [
      { title: `Guidance is free`, body: `Talking to us costs you nothing and puts you under no obligation.` },
      { title: `You decide`, body: `We lay out your options clearly. Which lender you choose is always your call.` },
      { title: `No spam, ever`, body: `We use your details to help with your loan options — not to flood your phone.` },
      { title: `Straight answers`, body: `We tell you what we can and can't do. We can't promise a loan — no honest platform can.` },
    ],
  },

  // Offering facts ONLY — never outcomes. Source: docs/homepage-spec.md §3.
  stats: [
    { value: `8`, label: `study destinations` },
    { value: `3`, label: `lender categories: banks, NBFCs & international lenders` },
    { value: `₹0`, label: `cost for your consultation` }, // Owner confirmed 2026-11-10: the consultation is free.
    { value: `100%`, label: `your decision, start to finish` },
  ],

  // Non-committal funding-gap line (we estimate; the lender decides actual figures). Source: edfinco.com/home.
  fundingGapNote: `We help you estimate your funding gap — how much you may actually need — so there are no surprises. The lender decides the final figures.`,

  platform: {
    section: {
      eyebrow: `One platform`,
      heading: `Many lenders. One place to compare.`,
      subhead: `Instead of chasing bank after bank on your own, explore options across different kinds of lenders in a single conversation — and see how they compare for your course, country and co-borrower.`,
    },
    categories: [
      { name: `Public & private banks`, body: `Traditional lenders many families know and trust. Terms and requirements vary by bank.` },
      { name: `NBFCs`, body: `Non-banking finance companies that focus on education loans, often with different eligibility criteria than banks.` },
      { name: `International private lenders`, body: `Lenders that fund students studying abroad, sometimes without requiring collateral in India — eligibility is still the lender's decision.` },
    ],
    // MANDATORY compliance line (lender decides).
    lenderDecidesLine: `Eligibility, sanction amount, interest, fees, collateral requirements and disbursement are all decided by the lender — not by EdFinco.`,
    cta: { label: `Book your free consultation`, href: CONSULT_HREF },
  },

  advisory: {
    eyebrow: `Stuck on something?`,
    heading: `Confused about collateral or co-signers? Talk to an advisor — free.`,
    body: `Every family has that one worry. "Papa, do we need to put the house as collateral?" "Beta, who has to be the co-borrower?" Bring your questions. We'll walk you through how it works for your situation — with no pressure to go ahead.`,
    ctaPrimary: { label: `Book your free consultation`, href: CONSULT_HREF },
    ctaSecondary: { label: `See how it works`, href: `#how-it-works` },
  },

  // Six-step process adapted from edfinco.com/home (reworded compliant: no speed/"fastrack"
  // claims; the final decision stays the lender's).
  howItWorks: {
    section: {
      eyebrow: `How it works`,
      heading: `Six honest steps. No surprises.`,
      subhead: `Here's exactly what happens when you work with EdFinco — and where the lender comes in.`,
    },
    steps: [
      { title: `Tell us your plan`, body: `Share your country, course, university and intake — it takes a few minutes.` },
      { title: `Estimate your cost & funding gap`, body: `We help you understand your estimated total cost and how much funding you may actually need.` },
      { title: `Profile review`, body: `We look at your academic and financial profile to understand your situation.` },
      { title: `Explore loan options`, body: `We show you potentially suitable options across banks, NBFCs and international lenders.` },
      { title: `Prepare your documents`, body: `We help you get your financial documentation organised.` },
      { title: `Apply — the lender decides`, body: `We help coordinate your application with the lender. Approval, amount and terms are entirely the lender's decision.` },
    ],
    cta: { label: `Book your free consultation`, href: CONSULT_HREF },
  },

  // "What we help with" — the three free services EdFinco offers (edfinco.com/home).
  // NOTE: "Mock visa guidance" is interview PRACTICE / guidance only — it is NOT a promise of a
  // visa or any immigration outcome. Keep the wording as practice/guidance, never an outcome.
  helpWith: {
    section: {
      eyebrow: `One Journey. One Partner. Zero Confusion.`, // Real client tagline (edfinco.com/home).
      heading: `What we help with — at no extra cost to you.`,
      subhead: `From your first question to your lender application, you get support at every step of the journey.`,
    },
    services: [
      { title: `Education loan assistance`, body: `Explore suitable loan options and get support right through the application.` },
      { title: `Financial documentation readiness`, body: `Get your financial documents organised and prepared.` },
      // PRACTICE / guidance only — never implies a visa outcome.
      { title: `Mock visa guidance`, body: `Personalised mock visa interview practice and financial-documentation guidance — practice, not a promise of a visa.` },
    ],
    cta: { label: `Book your free consultation`, href: CONSULT_HREF },
  },

  collateral: {
    section: {
      eyebrow: `Collateral, explained`,
      heading: `Collateral-free is possible. Guaranteed is not.`,
      subhead: `"Do we have to pledge the house?" is the question we hear most. Here's the honest answer.`,
    },
    cards: [
      { title: `With collateral`, body: `Some loans are secured against an asset like property or a fixed deposit. This can shape the amount and terms a lender is willing to offer.` },
      { title: `Collateral-free`, body: `Some lenders may offer collateral-free options to students who meet their eligibility criteria. It depends on factors like your course, university, co-borrower and the lender's own rules.` },
    ],
    // MANDATORY caveat — must appear wherever collateral-free is mentioned (brand.md).
    caveat: `No collateral does not mean guaranteed approval. Lenders can look at your academic background, university, course, future employment prospects and your co-borrower's financial standing. Eligibility and terms are always the lender's decision.`,
    cta: { label: `Talk to an advisor about your options`, href: CONSULT_HREF },
  },

  destinations: {
    section: {
      eyebrow: `Where to`,
      heading: `Eight destinations. One starting point.`,
      subhead: `Wherever you're headed, we help you explore funding options for it.`,
    },
    items: [
      { image: { src: `/photos/dest/usa.jpg`, alt: `The Statue of Liberty with the New York skyline` }, name: `USA`, reason: `The widest choice of universities and programs, from MS and MBA to research-driven PhDs.` },
      { image: { src: `/photos/dest/canada.jpg`, alt: `The CN Tower and Toronto skyline across the water` }, name: `Canada`, reason: `Globally respected universities and a popular route for students who value post-study options.` },
      { image: { src: `/photos/dest/uk.jpg`, alt: `Big Ben clock tower in London` }, name: `UK`, reason: `One-year Master's degrees and historic universities, close to home in time zone and pace.` },
      { image: { src: `/photos/dest/germany.jpg`, alt: `The Brandenburg Gate in Berlin` }, name: `Germany`, reason: `Strong public universities and a reputation for engineering, science and low tuition.` },
      { image: { src: `/photos/dest/australia.jpg`, alt: `The Sydney Opera House on the harbour` }, name: `Australia`, reason: `Well-ranked universities and a long-standing favourite for Indian students.` },
      { image: { src: `/photos/dest/ireland.jpg`, alt: `The Ha'penny Bridge over the River Liffey in Dublin` }, name: `Ireland`, reason: `A growing study hub in Europe, home to the European bases of many global companies.` },
      { image: { src: `/photos/dest/singapore.jpg`, alt: `Marina Bay, Singapore, lit up at night` }, name: `Singapore`, reason: `A compact, high-ranking education hub close to India, strong in business and tech.` },
      { image: { src: `/photos/dest/uae.jpg`, alt: `The Dubai skyline and Burj Khalifa at sunset` }, name: `UAE (Dubai)`, reason: `International campuses close to home, a familiar choice for many Indian families.` },
    ],
    cta: { label: `Book your free consultation`, href: CONSULT_HREF },
  },

  why: {
    section: {
      eyebrow: `Why EdFinco`,
      heading: `Why families work with us.`,
      subhead: `You could approach lenders one by one. Here's what changes when you don't have to.`,
    },
    columns: { withEdfinco: `With EdFinco`, onYourOwn: `On your own` },
    rows: [
      {
        topic: `Seeing your options`,
        withEdfinco: `Options across banks, NBFCs and international lenders in one conversation.`,
        onYourOwn: `Approaching each lender separately and comparing by hand.`,
      },
      {
        topic: `Understanding the fine print`,
        withEdfinco: `We explain collateral, co-borrowers and what lenders look for, in plain language.`,
        onYourOwn: `Decoding different requirements from every lender yourself.`,
      },
      {
        topic: `Who's in control`,
        withEdfinco: `You compare and choose. We guide, we never pressure.`,
        onYourOwn: `Easy to feel rushed by whoever you're talking to.`,
      },
      {
        topic: `What it costs to start`,
        withEdfinco: `A free consultation with no obligation.`,
        onYourOwn: `Your time, spread across many separate enquiries.`,
      },
    ],
    // Compliance spine location 3 of 5.
    notALenderLine: `EdFinco is not a lender. We don't approve loans or set rates — we help you find and compare options, and the lender makes the final decision.`,
    cta: { label: `Book your free consultation`, href: CONSULT_HREF },
  },

  faq: {
    eyebrow: `Straight facts`,
    heading: `The questions every parent asks.`,
    items: [
      {
        q: `Is EdFinco a bank or a lender?`,
        a: `No. EdFinco is an education-loan assistance platform. We help you find and compare options across banks, NBFCs and international private lenders. We don't lend money or approve loans ourselves.`,
      },
      {
        q: `Can you guarantee I'll get a loan?`,
        a: `No, and you should be careful of anyone who says they can. Eligibility, amount, pricing, fees, collateral and disbursement are all decided by the lender. What we can do is help you understand and compare your options.`,
      },
      {
        q: `Can we get a loan without collateral?`,
        a: `Some lenders may offer collateral-free options to students who meet their eligibility criteria. No collateral does not mean guaranteed approval — lenders still assess your course, university, co-borrower and more.`,
      },
      {
        q: `What does the consultation cost?`,
        // Owner action required: confirm whether EdFinco or any party charges the student a fee at any
        // later stage, and state clearly who charges what (spec Owner-action #3 — processing-fee clarity).
        a: `The consultation is free and there's no obligation to go ahead.`,
      },
      {
        q: `Who needs to be the co-borrower?`,
        a: `Most education loans for studying abroad need a co-borrower, usually a parent. Lenders look at the co-borrower's financial standing as part of the decision. We'll explain what's typically expected for your situation.`,
      },
      {
        q: `What do lenders look at?`,
        a: `Lenders can consider your academic background, university, course, future employment prospects and your co-borrower's financial standing. Each lender weighs these differently.`,
      },
      {
        q: `What do you do with my details?`,
        // Owner action required: align with published privacy policy and consultation API data handling
        // (spec Owner-action #7).
        a: `We use them to help with your loan options and to contact you about your enquiry — not to spam you.`,
      },
    ],
    cta: { label: `Still have a question? Book your free consultation`, href: CONSULT_HREF },
  },

  finalCta: {
    eyebrow: `Your Dreams, Funded!`,
    heading: `Let's find the right way to fund your study abroad.`,
    subhead: `Book a free consultation. We'll walk you through your options — and you decide what happens next.`,
    reassurance: `Free · No obligation · You stay in control`,
    // Compliance spine location 4 of 5.
    notALenderLine: `EdFinco is not a lender. We help Indian students and their families find and compare education-loan options across banks, NBFCs and international private lenders.`,
    ctaPrimary: { label: `Book your free consultation`, href: CONSULT_HREF },
    ctaSecondary: { label: `Explore destinations`, href: `#destinations` },
  },

  // Compliance spine location 5 of 5 (site-wide footer).
  // Legal name confirmed ("EdFinco", 2026-11-10). Owner action still required: any regulatory/disclosure
  // text (e.g. DSA / lender-commission disclosure) for a lawyer to confirm.
  footerDisclaimer: `EdFinco is an education-loan assistance platform (DSA), not a lender. We do not approve loans or set interest rates, amounts, fees or collateral requirements — those are decided by the lender.`,
};

/* ------------------------------------------------------------------ *
 * CONSULTATION PAGE (/consultation) — booking form + copy.
 * All claims-sensitive wording lives here (brand/brand.md rules apply):
 * no guaranteed / cheaper / faster / instant / named-lender / rate / outcome
 * language; "EdFinco is not a lender" stays prominent; "you choose, the lender
 * decides" framing throughout.
 * ------------------------------------------------------------------ */

export interface ConsultationFormLabels {
  studentName: string;
  email: string;
  phone: string;
  destination: string;
  studyLevel: string;
  intake: string;
  coBorrower: string;
  message: string;
}

export interface ConsultationContent {
  seo: { title: string; description: string; canonical: string };
  hero: {
    eyebrow: string;
    heading: string; // page <h1>
    subhead: string;
    reassurance: string;
    // Compliance spine: "EdFinco is not a lender".
    notALenderBadge: string;
  };
  expectations: {
    heading: string;
    items: TrustItem[];
  };
  form: {
    heading: string;
    intro: string;
    requiredNote: string;
    optionalTag: string;
    labels: ConsultationFormLabels;
    placeholders: {
      studentName: string;
      email: string;
      phone: string;
      destination: string;
      studyLevel: string;
      intake: string;
      coBorrower: string;
      message: string;
    };
    // Validation reuses these option lists; the API validates against the same arrays.
    destinationOptions: string[];
    studyLevelOptions: string[];
    consentLabel: string;
    // Split so the ConsultationForm can render "privacy policy" as a real link to /privacy.
    privacyNote: {
      before: string;
      linkLabel: string;
      linkHref: string;
      after: string;
    };
    submitLabel: string;
    submittingLabel: string;
    successTitle: string;
    successBody: string;
    referenceLabel: string;
    errorTitle: string;
    errorBody: string;
    rateLimitedBody: string;
    // Two-step form.
    stepLabel: string; // "{n}" is replaced with the step number
    step1Title: string;
    step1Note: string;
    continueLabel: string;
    step2Title: string;
    step2Intro: string;
    editContactLabel: string;
    expiredBody: string;
    errors: {
      studentName: string;
      email: string;
      phone: string;
      destination: string;
      studyLevel: string;
      intake: string;
      consent: string;
      generic: string;
    };
  };
  // Compliance spine near the form.
  notALenderLine: string;
}

// Option lists shared by the form (client) and the API (server) so validation
// stays in one place. Destinations mirror HOME.destinations (offering fact: 8).
export const CONSULTATION_DESTINATIONS: string[] = HOME.destinations.items.map((d) => d.name);
export const CONSULTATION_STUDY_LEVELS: string[] = [
  `Bachelor's`,
  `Master's`,
  `MBA`,
  `MS`,
  `Other`,
];

export const CONSULTATION: ConsultationContent = {
  seo: {
    title: "Book a free consultation · EdFinco", // ≤60 chars
    description:
      "Book a free, no-obligation consultation. We help you compare education-loan options for studying abroad — you choose, the lender decides.", // ≤155 chars
    canonical: "https://www.edfinco.com/consultation",
  },
  hero: {
    eyebrow: `Free consultation`,
    heading: `Book your free consultation`,
    subhead: `Tell us a little about your study-abroad plans and we'll help you understand and compare your education-loan options across banks, NBFCs and international private lenders.`,
    reassurance: `Free · No obligation · You choose, the lender decides`,
    // Compliance spine (consultation page).
    notALenderBadge: `EdFinco is not a lender. We help you compare options and apply — we never approve or fund loans ourselves.`,
  },
  expectations: {
    heading: `What to expect`,
    items: [
      // Reuses the homepage trust promises (brand-approved copy), focused for this page.
      { title: `Guidance is free`, body: `Your consultation costs nothing and puts you under no obligation.` },
      { title: `You stay in control`, body: `We lay out your options clearly. Which lender you choose is always your call.` },
      { title: `No spam, ever`, body: `We use your details to help with your loan options and to contact you about your enquiry — not to flood your phone.` },
      { title: `Straight answers`, body: `We tell you what we can and can't do. We can't promise a loan — no honest platform can.` },
    ],
  },
  form: {
    heading: `Your details`,
    intro: `A few minutes is all it takes. Fields marked with an asterisk (*) are required.`,
    requiredNote: `Required`,
    optionalTag: `Optional`,
    labels: {
      studentName: `Student name`,
      email: `Email`,
      phone: `Phone`,
      destination: `Destination country`,
      studyLevel: `Study level`,
      intake: `Intended intake`,
      coBorrower: `Who will co-borrow`,
      message: `Anything you'd like us to know`,
    },
    placeholders: {
      studentName: `e.g. Aarav Sharma`,
      email: `you@example.com`,
      phone: `e.g. +91 98765 43210`,
      destination: `Select a destination`,
      studyLevel: `Select a study level`,
      intake: `e.g. Fall 2026`,
      coBorrower: `e.g. Parent, sibling, relative`,
      message: `Your course, university, or any questions you have`,
    },
    destinationOptions: CONSULTATION_DESTINATIONS,
    studyLevelOptions: CONSULTATION_STUDY_LEVELS,
    consentLabel: `I agree to be contacted about my enquiry.`,
    // "privacy policy" links to /privacy (now published). NOTE: the /privacy page is still a
    // template — a qualified lawyer must complete its legal content before launch.
    privacyNote: {
      before: `We use your details to help with your loan options and to contact you about your enquiry. See our`,
      linkLabel: `privacy policy`,
      linkHref: `/privacy`,
      after: `for how we handle your data.`,
    },
    submitLabel: `Request my free consultation`,
    submittingLabel: `Sending…`,
    successTitle: `Thanks — request received`,
    successBody: `Thanks — we'll be in touch to set up your free consultation. EdFinco is not a lender; we help you compare options, and the lender makes the final decision.`,
    referenceLabel: `Your reference`,
    errorTitle: `Something went wrong`,
    errorBody: `We couldn't send your request just now. Please try again, or email us at hello@edfinco.com.`,
    rateLimitedBody: `You've already sent us a few requests, and we'll be in touch soon. For anything urgent, email hello@edfinco.com.`,
    stepLabel: `Step {n} of 2`,
    step1Title: `Your contact details`,
    step1Note: `We'll use these details to contact you about your enquiry, even if you don't finish the next step.`,
    continueLabel: `Continue`,
    step2Title: `Your study plans`,
    step2Intro: `A few details help your advisor prepare for your free consultation.`,
    editContactLabel: `Edit contact details`,
    expiredBody: `That took a little while, so please confirm your contact details again.`,
    errors: {
      studentName: `Please enter the student's name.`,
      email: `Please enter a valid email address.`,
      phone: `Please enter a valid phone number.`,
      destination: `Please choose a destination country.`,
      studyLevel: `Please choose a study level.`,
      intake: `Please tell us your intended intake (e.g. Fall 2026).`,
      consent: `Please tick the box so we can contact you about your enquiry.`,
      generic: `Please check the highlighted fields and try again.`,
    },
  },
  // Compliance spine near the form.
  notALenderLine: `EdFinco is not a lender. We don't approve loans or set rates, amounts, fees or collateral requirements — we help you find and compare options, and the lender makes the final decision.`,
};

/* ------------------------------------------------------------------ *
 * SHARED COMPLIANCE LINE — "EdFinco is not a lender" (brand/brand.md).
 * Reused on the About + legal pages so the spine wording stays identical.
 * ------------------------------------------------------------------ */
export const NOT_A_LENDER_LINE = `EdFinco is not a lender. We don't approve loans or set interest rates, amounts, fees or collateral requirements — we help you find and compare options, and the lender makes the final decision.`;

// The eight study destinations are an OFFERING fact (never an outcome). Mirrors HOME.destinations.
export const DESTINATION_NAMES: string[] = HOME.destinations.items.map((d) => d.name);

/* ------------------------------------------------------------------ *
 * ABOUT PAGE (/about) — trust-building. Claims-compliant: EdFinco is a DSA /
 * assistance platform, NOT a lender; no outcome stats, no named lenders, no
 * rates, no guaranteed/cheaper/faster/instant/best/lowest language. Any real
 * fact we don't have (year founded, students helped, address) is left as a
 * visible {/* Owner action required *\/} placeholder in the page, never invented.
 * ------------------------------------------------------------------ */

export interface AboutPillar {
  title: string;
  body: string;
}

export interface AboutContent {
  seo: { title: string; description: string; canonical: string };
  hero: {
    eyebrow: string;
    heading: string; // page <h1>
    subhead: string;
    // Compliance spine (hero).
    notALenderBadge: string;
  };
  who: {
    heading: string;
    body: string[]; // paragraphs
  };
  what: {
    heading: string;
    subhead: string;
    pillars: AboutPillar[];
  };
  destinations: {
    heading: string;
    subhead: string;
    names: string[]; // offering fact: 8 destinations
  };
  can: {
    heading: string;
    items: string[];
  };
  cant: {
    heading: string;
    items: string[];
  };
  // Compliance spine near the close.
  notALenderLine: string;
  cta: {
    heading: string;
    body: string;
    primary: CtaLink;
  };
}

export const ABOUT: AboutContent = {
  seo: {
    title: "About EdFinco — Education-Loan Assistance", // ≤60 chars
    description:
      "EdFinco is an education-loan assistance platform (DSA) for Indian students going abroad. Not a lender — we help you compare options; you decide.", // ≤155 chars
    canonical: "https://www.edfinco.com/about",
  },
  hero: {
    eyebrow: `About EdFinco`,
    heading: `Honest help for funding your study abroad.`,
    subhead: `EdFinco is an education-loan assistance platform for Indian students and families planning to study abroad. We help you find and compare options — you choose, the lender decides.`,
    // Compliance spine (hero).
    notALenderBadge: `EdFinco is not a lender. We help you compare options and apply — we never approve or fund loans ourselves.`,
  },
  who: {
    heading: `Who we are`,
    body: [
      `EdFinco is an education-loan assistance platform — a Direct Selling Agent (DSA) — for Indian students planning to study abroad. We are not a lender. We do not lend money, approve loans, or set interest rates, loan amounts, fees or collateral requirements.`,
      `What we do is simpler, and we think more useful: we help students and their families understand the education-loan landscape and compare options across public and private banks, NBFCs and international private lenders — in one conversation instead of chasing lender after lender on your own.`,
      `Our guidance is free and puts you under no obligation. You stay in control of every decision, from which lenders to consider to whether you apply at all.`,
      /* Owner action required: add real "about" facts only once confirmed — e.g. year founded,
         number of students helped, office address, team. Do NOT invent these; leave them out
         until the owner supplies verified values (brand/brand.md: no fabricated stats). */
    ],
  },
  what: {
    heading: `What we do`,
    subhead: `Four ways EdFinco helps — all free, all on your terms.`,
    pillars: [
      {
        title: `Map your options`,
        body: `We show you suitable education-loan options across banks, NBFCs and international private lenders for your course, country and co-borrower.`,
      },
      {
        title: `Explain the fine print`,
        body: `We explain collateral, co-borrowers and what lenders typically look for, in plain language — so nothing takes you by surprise.`,
      },
      {
        title: `Free, no-obligation guidance`,
        body: `Talking to us costs nothing and puts you under no obligation. Bring your questions and we'll walk you through them.`,
      },
      {
        title: `You stay in control`,
        body: `You compare the options and choose which lender to apply to. We guide — we never pressure, and we never decide for you.`,
      },
    ],
  },
  destinations: {
    heading: `Eight destinations we help with`,
    subhead: `Wherever you're headed, we help you explore funding options for it.`,
    names: DESTINATION_NAMES,
  },
  can: {
    heading: `What we can do`,
    items: [
      `Help you find and compare education-loan options across public and private banks, NBFCs and international private lenders.`,
      `Explain how collateral, co-borrowers and eligibility generally work.`,
      `Support you as you prepare and submit your application to a lender.`,
      `Answer your questions — for free, with no obligation.`,
    ],
  },
  cant: {
    heading: `What we can't do`,
    items: [
      `We can't promise or guarantee you a loan, a visa or admission — and you should be wary of anyone who says they can.`,
      `We can't decide your eligibility, loan amount, interest, fees, collateral requirement or disbursement — the lender decides all of these.`,
      `We can't speak for a lender's final decision on your application.`,
      `No collateral does not mean guaranteed approval — lenders still assess your course, university, co-borrower and their own rules.`,
    ],
  },
  // Compliance spine near the close.
  notALenderLine: NOT_A_LENDER_LINE,
  cta: {
    heading: `Have questions about your options?`,
    body: `Book a free, no-obligation consultation. We'll walk you through your options — and you decide what happens next.`,
    primary: { label: `Book a free consultation`, href: CONSULT_HREF },
  },
};

/* ------------------------------------------------------------------ *
 * LEGAL PAGES (/privacy, /terms, /disclaimer) — TEMPLATES, NOT LEGAL ADVICE.
 * Every page carries a visible owner/lawyer notice and uses bracketed
 * [Owner action required: ...] placeholders for anything that needs a real
 * legal value. We do NOT invent binding terms, entity names, dates, addresses
 * or registration numbers. Claims rules still apply: no guaranteed / named
 * lenders / rates / outcome stats / cheaper / faster / instant / best / lowest.
 * ------------------------------------------------------------------ */

export interface LegalSection {
  heading: string;
  body?: string[]; // paragraphs (may contain visible [Owner action required: ...] placeholders)
  list?: string[]; // optional bullet list
}

export interface LegalPageContent {
  seo: { title: string; description: string; canonical: string };
  eyebrow: string;
  heading: string; // page <h1>
  intro: string;
  // Styled callout shown at the top of every legal page.
  ownerNotice: string;
  lastUpdatedNote: string;
  sections: LegalSection[];
  // Compliance spine.
  notALenderLine: string;
}

const LEGAL_OWNER_NOTICE = `This page is a template placeholder, not legal advice. EdFinco's owner must have it reviewed and completed by a qualified lawyer before this site goes live. Items marked "Owner action required" are placeholders to be filled in.`;
const LEGAL_LAST_UPDATED = `Last updated: [Owner action required: insert effective date before launch.]`;

export const PRIVACY: LegalPageContent = {
  seo: {
    title: "Privacy Policy · EdFinco", // ≤60 chars
    description:
      "How EdFinco handles the details you share through our consultation form. A template to be completed by a qualified lawyer before launch.", // ≤155 chars
    canonical: "https://www.edfinco.com/privacy",
  },
  eyebrow: `Legal`,
  heading: `Privacy Policy`,
  intro: `This policy explains what personal details EdFinco collects through this website and how we use them. EdFinco is not a lender.`,
  ownerNotice: LEGAL_OWNER_NOTICE,
  lastUpdatedNote: LEGAL_LAST_UPDATED,
  sections: [
    {
      heading: `Who we are`,
      body: [
        `EdFinco is an education-loan assistance platform (a DSA) for Indian students studying abroad. EdFinco is not a lender.`,
        `The legal entity responsible for this website and the details you share through it is EdFinco. [Owner action required: insert EdFinco's registered address and the official contact for privacy requests.]`,
      ],
    },
    {
      heading: `What we collect`,
      body: [
        `When you use our consultation form, we collect the details you choose to provide so we can help with your education-loan options and contact you about your enquiry:`,
        `The form has two steps. If you complete the first step (your name, email, phone number and agreement to be contacted) but not the second, we keep those details and may contact you about your enquiry.`,
      ],
      list: [
        `Student name`,
        `Email address`,
        `Phone number (optional)`,
        `Destination country`,
        `Study level`,
        `Intended intake (optional)`,
        `Who will co-borrow (optional)`,
        `Your message (optional)`,
        `Your consent to be contacted`,
      ],
    },
    {
      heading: `Why we use your details`,
      body: [
        `We use these details to help you find and compare education-loan options and to contact you about your enquiry. We do not use them to send spam.`,
        `[Owner action required: confirm all processing purposes and the legal basis for each.]`,
      ],
    },
    {
      heading: `Sharing with lender partners`,
      body: [
        `[Owner action required: describe whether and how enquiry details are shared with partner banks, NBFCs or lenders, on what basis, with what safeguards, and how users are informed. Do not launch without this.]`,
      ],
    },
    {
      heading: `Service providers`,
      body: [
        `We use service providers to run this website and handle your enquiry: website hosting, a database, email delivery, and a Google Sheet our team uses to follow up on consultation requests.`,
        `[Owner action required: name each provider (for example Google for Google Sheets, Resend for email, Neon for the database and your hosting company), where they store data, and the safeguards in place.]`,
      ],
    },
    {
      heading: `How long we keep your details`,
      body: [
        `[Owner action required: insert the data retention period and the deletion process.]`,
      ],
    },
    {
      heading: `Your rights`,
      body: [
        `[Owner action required: describe how users can access, correct, delete or withdraw consent for their data, the process to request this, and the timelines you commit to.]`,
      ],
    },
    {
      heading: `Grievance officer`,
      body: [
        `[Owner action required: insert grievance officer name, designation and contact details as required by applicable law.]`,
      ],
    },
    {
      heading: `Contact us`,
      body: [
        `Questions about this policy? Email us at hello@edfinco.com.`,
        `[Owner action required: confirm the correct contact route and add a postal address if required.]`,
      ],
    },
  ],
  notALenderLine: NOT_A_LENDER_LINE,
};

export const TERMS: LegalPageContent = {
  seo: {
    title: "Terms of Service · EdFinco", // ≤60 chars
    description:
      "The terms for using EdFinco, an education-loan assistance platform (not a lender). A template for a qualified lawyer to complete before launch.", // ≤155 chars
    canonical: "https://www.edfinco.com/terms",
  },
  eyebrow: `Legal`,
  heading: `Terms of Service`,
  intro: `These terms govern your use of the EdFinco website. EdFinco is an education-loan assistance platform (a DSA), not a lender.`,
  ownerNotice: LEGAL_OWNER_NOTICE,
  lastUpdatedNote: LEGAL_LAST_UPDATED,
  sections: [
    {
      heading: `Nature of our service`,
      body: [
        `EdFinco is an education-loan assistance platform (a DSA) for Indian students studying abroad. EdFinco is not a lender. We help you find and compare education-loan options across public and private banks, NBFCs and international private lenders. We do not approve loans or set interest rates, amounts, fees or collateral requirements.`,
        `We do not guarantee any loan, approval, visa or admission. Eligibility, sanction amount, pricing, fees, collateral and disbursement are decided solely by the lender.`,
      ],
    },
    {
      heading: `Using this site`,
      body: [
        `By using this site you agree to use it lawfully and to provide accurate information in any enquiry you submit.`,
        `[Owner action required: insert acceptable-use terms, any account terms, and age / eligibility requirements.]`,
      ],
    },
    {
      heading: `Your responsibilities`,
      body: [
        `You are responsible for the information you provide and for your own decisions about which lender to approach and whether to proceed. Please read each lender's own terms before you apply.`,
      ],
    },
    {
      heading: `Lender decisions`,
      body: [
        `Any decision on your application — including approval, loan amount, interest, fees, collateral and disbursement — is made by the lender, not by EdFinco. EdFinco is not responsible for a lender's decision.`,
      ],
    },
    {
      heading: `Fees`,
      body: [
        `[Owner action required: state clearly whether EdFinco charges the student any fee at any stage, who charges what, and when. Do not launch without this.]`,
      ],
    },
    {
      heading: `Limitation of liability`,
      body: [
        `[Owner action required: insert limitation of liability terms drafted by a qualified lawyer.]`,
      ],
    },
    {
      heading: `Indemnity`,
      body: [
        `[Owner action required: insert indemnity terms drafted by a qualified lawyer.]`,
      ],
    },
    {
      heading: `Governing law and disputes`,
      body: [
        `[Owner action required: insert governing law, jurisdiction and dispute-resolution terms.]`,
      ],
    },
    {
      heading: `Changes and contact`,
      body: [
        `[Owner action required: insert how changes to these terms are notified to users.]`,
        `Questions about these terms? Email us at hello@edfinco.com.`,
      ],
    },
  ],
  notALenderLine: NOT_A_LENDER_LINE,
};

export const DISCLAIMER: LegalPageContent = {
  seo: {
    title: "Disclaimer · EdFinco", // ≤60 chars
    description:
      "EdFinco is not a lender. General information only — the lender decides eligibility, amount, pricing, collateral and disbursement. A template.", // ≤155 chars
    canonical: "https://www.edfinco.com/disclaimer",
  },
  eyebrow: `Legal`,
  heading: `Disclaimer`,
  intro: `Please read this disclaimer about the information on the EdFinco website.`,
  ownerNotice: LEGAL_OWNER_NOTICE,
  lastUpdatedNote: LEGAL_LAST_UPDATED,
  sections: [
    {
      heading: `EdFinco is not a lender`,
      body: [
        `EdFinco is an education-loan assistance platform (a DSA). EdFinco is not a lender. We do not lend money, approve loans, or set interest rates, amounts, fees or collateral requirements.`,
      ],
    },
    {
      heading: `General information only`,
      body: [
        `The information on this site is general in nature and is provided to help you understand and compare education-loan options. It is not financial, legal, tax or immigration advice. Please seek professional advice for your own situation.`,
      ],
    },
    {
      heading: `The lender decides`,
      body: [
        `Eligibility, sanction amount, interest, fees, collateral requirements and disbursement are all decided by the lender — not by EdFinco. We cannot promise or guarantee any loan, approval, visa or admission.`,
      ],
    },
    {
      heading: `About collateral`,
      body: [
        `Some lenders may offer collateral-free options to students who meet their eligibility criteria. No collateral does not mean guaranteed approval — lenders still assess factors such as your course, university, co-borrower and their own rules.`,
      ],
    },
    {
      heading: `Partner-lender disclosures`,
      body: [
        `[Owner action required: insert any partner-lender disclosures and relationships that must be disclosed.]`,
      ],
    },
    {
      heading: `Fees and registrations`,
      body: [
        `[Owner action required: disclose any fees EdFinco charges and any regulatory registrations or licences held.]`,
      ],
    },
    {
      heading: `External links`,
      body: [
        `This site may link to third-party websites. We are not responsible for the content or practices of those sites.`,
      ],
    },
  ],
  notALenderLine: NOT_A_LENDER_LINE,
};
