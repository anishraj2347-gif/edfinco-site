// Deterministic checks for every draft the writer submits, before anything is emailed to the
// admin. ERRORS are hard rules (the submission is rejected and the writer must fix them).
// WARNINGS are shown to the admin in the approval email and dashboard for a human decision —
// a keyword can't tell "we guarantee approval" (banned) from "no one can guarantee approval" (fine).
// Rules come from brand/brand.md, the edfinco-marketing skill and the Lexend-only font rule.
import { safeHref, wordCount } from "@/lib/markdown";

export const DISCLAIMER_LINE =
  "> EdFinco is a loan-assistance platform, not a lender. Loan approval, amount, interest rate and terms are decided solely by the lender.";

export interface Submission {
  title: string;
  description: string;
  tags: string[];
  body: string;
  sources: string[];
  newTopics: string[];
}

export interface Checks {
  errors: string[];
  warnings: string[];
  wordCount: number;
}

// Characters Lexend (the site's only font) is served with, beyond Latin-1.
const EXTRA_ALLOWED = new Set(["₹", "‘", "’", "“", "”", "…", "–"]);

const NAMED_LENDERS =
  /\b(SBI|State Bank of India|HDFC|ICICI|Axis Bank|Kotak|Bank of Baroda|Punjab National Bank|PNB|Canara Bank|Union Bank|IDFC|IDBI|Yes Bank|IndusInd|Avanse|Credila|Auxilo|InCred|Prodigy Finance|MPOWER|Leap Finance|Tata Capital|Poonawalla|Bajaj Finserv|Aditya Birla|Sallie Mae|SoFi)\b/i;

// Phrases that are never compliant in EdFinco copy.
const HARD_BANNED: [RegExp, string][] = [
  [/\bguaranteed (approval|loan|disbursal|visa|admission)s?\b/i, "promises a guaranteed outcome"],
  [/\b(100|hundred) ?% (approval|success)\b/i, "claims a 100% outcome"],
  [/\binstant (approval|loan|disbursal|sanction)\b/i, "promises instant approval"],
  [/\b(cheapest|lowest)\b/i, "uses a cheapest/lowest superlative"],
  [/\bbest (rate|rates|interest|deal|deals|lender|lenders|loan|loans)\b/i, "uses a best-rate superlative"],
  [/\bhassle[- ]free\b/i, "uses 'hassle-free'"],
  [/\b(fastest|quickest)\b/i, "uses a speed superlative"],
  [/\d+(\.\d+)?\s?%\s?(p\.?\s?a\.?|per annum|interest|rate|apr)\b/i, "states an interest rate"],
];

// Worth a human look; often fine in context.
const SOFT_FLAGS: [RegExp, string][] = [
  [/\b(guarantee|guarantees|guaranteed|assured|assure)\b/i, "mentions guarantees — confirm it is a negation (e.g. 'no one can guarantee approval')"],
  [/\d\s?%/, "contains a percentage — make sure it is not a rate, fee or success-rate claim"],
  [/\bmost (lenders|banks|students|parents|families|universities)\b/i, "makes a 'most …' market-wide claim — needs a source or 'many'"],
  [/\b(will|always) (approve|get approved|be approved|be sanctioned)\b/i, "states what a lender will do as certain"],
  [/\b(our|happy) (students|customers|clients)\b/i, "refers to customer outcomes — no testimonials or stories presented as real"],
  [/(?<!collateral-)\bfree\b(?!,? (no-obligation )?consultation)/i, "uses 'free' about something other than the consultation"],
];

function clean(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  // Normalise newlines, strip control characters (keep \n and \t), cap the length.
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .slice(0, max)
    .trim();
}

function cleanList(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => clean(x, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

/** Shape validation + normalisation of an untrusted submission body. */
export function parseSubmission(raw: unknown): { value: Submission | null; errors: string[] } {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { value: null, errors: ["Body must be a JSON object."] };
  }
  const r = raw as Record<string, unknown>;
  const errors: string[] = [];
  for (const k of ["title", "description", "body"]) {
    if (typeof r[k] !== "string") errors.push(`"${k}" must be a string.`);
  }
  for (const k of ["tags", "sources"]) {
    if (r[k] !== undefined && !Array.isArray(r[k])) errors.push(`"${k}" must be an array of strings.`);
  }
  if (errors.length) return { value: null, errors };
  return {
    value: {
      title: clean(r.title, 200),
      description: clean(r.description, 400),
      tags: cleanList(r.tags, 8, 60),
      body: clean(r.body, 40_000),
      sources: cleanList(r.sources, 12, 400),
      newTopics: cleanList(r.newTopics, 30, 300),
    },
    errors: [],
  };
}

export function checkPost(s: Submission): Checks {
  const errors: string[] = [];
  const warnings: string[] = [];
  const all = `${s.title}\n${s.description}\n${s.tags.join("\n")}\n${s.body}`;
  const words = wordCount(s.body);

  // Field shape.
  if (s.title.length < 15 || s.title.length > 90) errors.push(`Title must be 15–90 characters (now ${s.title.length}).`);
  if (s.description.length < 60 || s.description.length > 160)
    errors.push(`Description must be 60–160 characters (now ${s.description.length}); aim for ≤155.`);
  else if (s.description.length > 155) warnings.push("Description is over 155 characters (may be cut off in Google).");
  if (s.tags.length < 1 || s.tags.length > 5) errors.push("Give 1–5 tags.");
  if (s.tags.some((t) => t.length > 30)) errors.push("Each tag must be 30 characters or fewer.");

  // Length.
  if (words < 600 || words > 1300) errors.push(`Body must be 600–1300 words (now ${words}); target 700–1000.`);
  else if (words < 700 || words > 1000) warnings.push(`Body is ${words} words (target 700–1000).`);

  // Supported Markdown subset only.
  const lines = s.body.split("\n");
  if (lines.some((l) => /^#\s/.test(l.trim()))) errors.push("No H1 (# ) headings — the title is the page's only H1. Use ## and ###.");
  if (/<\/?[a-zA-Z!][^>]*>/.test(s.body)) errors.push("No HTML tags in the body.");
  if (/!\[[^\]]*\]\(/.test(s.body)) errors.push("No images in the body (the header image is set by the site).");
  if (lines.some((l) => /^\s*\|.*\|\s*$/.test(l))) errors.push("No tables.");
  if (/```|~~~/.test(s.body)) errors.push("No code blocks.");
  for (const m of s.body.matchAll(/\]\(([^)\s]*)\)/g)) {
    if (!safeHref(m[1])) errors.push(`Link "${m[1].slice(0, 80)}" is not allowed — use /internal-paths or https:// links.`);
  }
  if (!/\]\(\/consultation(#[\w-]+)?\)/.test(s.body)) errors.push("Link to /consultation at least once, e.g. [book a free consultation](/consultation).");

  // Mandatory closing line.
  const lastLine = lines.map((l) => l.trim()).filter(Boolean).pop() ?? "";
  if (lastLine !== DISCLAIMER_LINE) errors.push(`The final line must be exactly: ${DISCLAIMER_LINE}`);

  // Brand + font rules.
  if (all.includes("—")) errors.push("No em dashes (—) anywhere; use commas, full stops or brackets.");
  const badChars = [...new Set([...all].filter((c) => (c.codePointAt(0) ?? 0) > 0xff && !EXTRA_ALLOWED.has(c) && c !== "—"))];
  if (badChars.length)
    errors.push(`Remove characters the site font (Lexend) doesn't have: ${badChars.join(" ")} (no emoji, arrows or maths symbols).`);
  const lender = all.match(NAMED_LENDERS);
  if (lender) errors.push(`Do not name lenders (found "${lender[0]}").`);
  for (const [re, why] of HARD_BANNED) {
    const m = all.match(re);
    if (m) errors.push(`Claims rule: ${why} ("${m[0]}").`);
  }
  for (const [re, why] of SOFT_FLAGS) {
    if (re.test(all)) warnings.push(`Check: ${why}.`);
  }

  // Sources (audit trail for factual claims).
  if (s.sources.some((u) => !/^https:\/\/[^\s]+$/i.test(u))) errors.push("Every source must be an https:// URL.");
  if (s.sources.length === 0) warnings.push("No sources listed — make sure the post makes no factual claims that need one.");

  return { errors, warnings, wordCount: words };
}
