---
name: edfinco-blog
description: How the EdFinco blog automation works — admin-approved posts written and revised by a Claude Code routine on the owner's Claude Pro plan (zero AI cost), with approval emails, an /admin dashboard, and the website as the scheduler. Use when changing the blog workflow, the writing/compliance rules, the dashboard, or when debugging why a draft or approval email didn't happen.
---

# EdFinco blog automation

**Owner requirements (2026-11-10):** every post is approved by an admin before it goes live; the
draft is emailed for approval N hours before posting (N admin-editable, default 12); the admin can
request changes and receive the revised version by email (repeatable); the admin can pause the
automation and change the posting time and email lead time from a login-protected dashboard.
**AI cost must be zero** — writing and rewriting use the owner's Claude Pro plan, never an API key.

## Architecture (all in `edfinco-site/`)
- **State:** Postgres (`DATABASE_URL`, Neon free) — embedded PGlite in `.data/pglite` for local dev.
  Schema: `lib/server/schema.ts`. Posts, versions, review tokens, jobs, topics, sessions, audit log.
- **Scheduler:** `lib/server/tick.ts`, called hourly by `.github/workflows/blog-scheduler.yml`
  (`/api/automation/tick`, Bearer `CRON_SECRET`) and opportunistically on blog/dashboard visits.
- **Writer:** a Claude Code routine on the owner's Claude Pro plan, fired through its API trigger
  (`lib/server/jobs.ts` + `lib/server/writer-connection.ts`). Connected by the main admin in
  `/admin/writer` (URL + token, token AES-256-GCM encrypted in `writer_connection`, key from
  `SECRETS_KEY` or `CRON_SECRET`; "Send a test run" fires `kind: "test"`) or by
  `ROUTINE_FIRE_URL` + `ROUTINE_FIRE_TOKEN` env vars, which win. Anthropic does NOT allow third-party
  sites to offer claude.ai login (Agent SDK docs), so never build a "Sign in with Claude" button: the
  owner signs in on claude.ai and connects the routine. Payload = `{jobId, token, kind}`; the routine
  GETs `/api/automation/jobs/<id>` and POSTs `/result` (or `/fail`). Prompt source:
  `lib/server/routine-prompt.ts` (shown in `/admin/writer` with the site URL filled in);
  `automation/routine-prompt.md` is a synced copy. Submissions carry `changeSummary` (the writer's
  chat reply, stored as `post_versions.writer_note`).
- **Rules:** `lib/server/writer-instructions.ts` (sent to the writer) and
  `lib/server/post-checks.ts` (hard errors → 422 back to the writer; warnings → shown to the admin).
- **Approval = review chat:** emails (`lib/server/email-templates.ts`, Resend) carry ONE link,
  `/review/<token>` (7 days, per post): the newest version + a chat with the writer
  (`components/ReviewChat.tsx`, built from `post_versions.feedback` + `writer_note`). Sending a change
  POSTs `/api/review/<token>` (JSON for fetch, redirect for no-JS); the chat polls
  `/api/review/<token>/status` and refreshes when the new version lands. Dashboard post page has
  "Open the chat" (action `chat` mints a link). Dashboard `/admin` (email magic-link sign-in,
  `lib/server/auth.ts`).
- **Access:** `lib/server/staff.ts` — main admin(s) from `MAIN_ADMIN_EMAILS`; others added in
  `/admin/team` (role admin|team), pending until a main admin approves; only active members get links.
- **Consultation requests:** `app/api/consultation/route.ts` → `lib/server/leads.ts` (stored) →
  `lib/server/lead-workflow.ts` (instant team email + student confirmation); worked in `/admin/leads`;
  tick retries failed alerts and nudges after 2 h (9am–9pm IST).
- **Public blog:** `lib/blog.ts` shows only `approved` posts whose `publish_at <= now()`.

## Rules that must not regress
- Nothing unapproved is ever published; a missed slot carries the draft to the next slot.
- Every state change is a conditional UPDATE checked on status + version. Review links follow the
  post to its newest version, but every action posts the version on screen, which must still be
  the newest and pending review (so nobody approves a version they haven't seen).
- Tokens (login, review, writer job) are random, hashed at rest, short-lived, single-purpose.
- No secret ever reaches the browser; forms are same-origin; no CORS; Markdown never renders HTML.
- Pages with forms must NOT use `referrer: "no-referrer"`: browsers then send `Origin: null` on form
  posts and the same-origin check 403s (bug found 2026-11-10). Admin/review layouts use `same-origin`;
  `isSameOrigin` accepts `Origin: null` only with `Sec-Fetch-Site: same-origin`. Test form posts with
  browser-like headers (`Origin: null` + `Sec-Fetch-Site`), not only a hand-set real Origin.
- Writing rules: brand/brand.md claims rules, the accuracy rules (never understate collateral or
  co-borrower risk, no unsourced "most" claims, "free" = consultation only, no processing-fee topic),
  no em dashes, Lexend-only characters, the exact closing "not a lender" line.

## Local testing
`npm run dev`, sign in with the `MAIN_ADMIN_EMAILS` address from `.env.local` (link saved in
`.data/outbox/`), then `node scripts/dev-worker.mjs` plays the routine. Setup for production:
`docs/blog-automation-setup.md`. On Windows, stopping the dev server's background task leaves
Next's `start-server.js` child running — stop that node process too before restarting.
