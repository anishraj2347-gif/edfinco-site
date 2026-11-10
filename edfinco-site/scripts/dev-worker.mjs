#!/usr/bin/env node
// LOCAL TESTING ONLY — stands in for the Claude routine so the approval flow can be tested on a
// laptop without the cloud. In development the website writes each "fire" payload to
// .data/dev-fires/; this script picks them up, fetches the job exactly like the routine does,
// and submits a clearly-labelled [Test] draft (or a revision).
//
//   node scripts/dev-worker.mjs           process every waiting job
//   node scripts/dev-worker.mjs --bad     first submit an invalid draft (tests the 422 path)
//
// Never used in production: there the real Claude routine (automation/routine-prompt.md) runs.
import fs from "node:fs";
import path from "node:path";

const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
const DIR = path.join(process.cwd(), ".data", "dev-fires");
const BAD_FIRST = process.argv.includes("--bad");
const DISCLAIMER =
  "> EdFinco is a loan-assistance platform, not a lender. Loan approval, amount, interest rate and terms are decided solely by the lender.";

function testArticle(topic) {
  const subject = (topic || "Planning your study abroad funding").split(" — ")[0];
  const para = (s) => `${s}\n`;
  const body = [
    para(`This is a test draft written by the local stand-in for the Claude writer. It exists so the approval emails, the review page and the dashboard can be checked end to end. The topic it would cover is: ${subject}.`),
    "## Start with the full picture\n",
    para("Before you compare any loan, write down the whole cost of the course. Include tuition, living costs for every month you will be away, travel, insurance, deposits and a sensible buffer for surprises. Then subtract the money your family already has set aside. What is left is the funding gap a loan may help with, and knowing it keeps every conversation with a lender grounded in your real numbers rather than a guess."),
    para("Many families skip this step and end up borrowing more or less than they need. Borrowing too little can leave you short halfway through a semester. Borrowing too much means paying interest on money you never needed. A simple written plan avoids both problems and makes it easier to explain your situation clearly."),
    "## What lenders usually look at\n",
    para("Each lender sets its own rules, so treat this as a checklist of questions rather than a promise of how any application will go. Lenders often look at the course and the university, the total amount requested, the co-borrower's income and repayment history, and whether any security is being offered. Requirements vary by lender and by profile, and the lender alone decides approval, amount, interest rate and terms."),
    para("If a parent is co-borrowing, it helps to understand that a co-borrower is usually responsible for the whole loan, not just a share of it. Missed payments can affect their credit history as well as yours. Talk this through as a family before anyone signs, so everyone is comfortable with the commitment they are making."),
    "## Documents to gather early\n",
    "- Your admission letter and the university's cost of attendance\n- Identity and address proof for you and your co-borrower\n- Income documents for the co-borrower, such as salary slips or tax returns\n- Bank statements covering the period your lender asks for\n- Academic records, including marksheets and degree certificates\n",
    para("Ask each lender for its own list, because the documents one lender needs can differ from another. Keeping clear copies in one folder saves time when you are asked for something at short notice."),
    "## Questions to ask before you sign\n",
    "1. What is the total cost of the loan over its full life, not just the monthly payment?\n2. Is the interest rate fixed or floating, and how could it change?\n3. Is there a repayment holiday while you study, and does interest build up during it?\n4. What happens if you want to repay early?\n5. Which documents will the lender hold, and for how long?\n",
    para("Write the answers down for every offer you consider. Comparing offers side by side, on the same questions, is the most reliable way to see the real differences between them."),
    "## A simple next step\n",
    para("If you would like help working through your own numbers and questions, you can [book a free consultation](/consultation). An advisor can walk you and your family through the options and help you prepare, with no obligation to go ahead. This paragraph also pads the test draft to a realistic length so the word count checks behave as they would for a real article, which keeps the local test close to what the real writer will send."),
    para("Planning ahead takes a little time, but it gives you a clearer view of what you are borrowing and why. It also helps you have calmer, better informed conversations at home and with lenders. A good plan is one your whole family understands and agrees with before the first payment is ever due."),
    DISCLAIMER,
  ].join("\n");
  return {
    title: `[Test] ${subject}`.slice(0, 90),
    description: "A test draft from the local writer stand-in, used to check approval emails, review links and the admin dashboard.",
    tags: ["Education loans", "Planning"],
    body,
    sources: [],
    newTopics: [],
  };
}

function revise(draft, feedback) {
  const lines = draft.body.split("\n");
  const at = lines.findIndex((l) => l.startsWith("## A simple next step"));
  const note = `This version was revised after the editor asked: ${String(feedback).replace(/[^\x20-\x7E]/g, " ").slice(0, 300)}`;
  lines.splice(at > 0 ? at : lines.length - 1, 0, note, "");
  return {
    title: draft.title,
    description: draft.description,
    tags: draft.tags,
    body: lines.join("\n"),
    sources: draft.sources,
    newTopics: [],
  };
}

async function call(url, token, body) {
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${token}`, ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort() : [];
if (!files.length) {
  console.log("No waiting jobs in .data/dev-fires/.");
  process.exit(0);
}
for (const f of files) {
  const file = path.join(DIR, f);
  const { jobId, token } = JSON.parse(fs.readFileSync(file, "utf8"));
  fs.renameSync(file, `${file}.done`);
  const job = await call(`${APP_URL}/api/automation/jobs/${jobId}`, token);
  if (job.status !== 200) {
    console.log(`job ${jobId}: GET -> ${job.status} ${job.data.error ?? ""}`);
    continue;
  }
  const { kind } = job.data.job;
  const ctx = job.data.context;
  const result = kind === "revise" ? revise(ctx.currentDraft, ctx.feedback) : testArticle(ctx.topic);
  if (BAD_FIRST) {
    const bad = await call(job.data.submitUrl, token, { ...result, body: "Too short — and no disclaimer → ✓" });
    console.log(`job ${jobId}: invalid submission -> ${bad.status}`, bad.data.errors ?? bad.data);
  }
  const sub = await call(job.data.submitUrl, token, result);
  console.log(`job ${jobId} (${kind}): submit -> ${sub.status}`, JSON.stringify(sub.data));
}
