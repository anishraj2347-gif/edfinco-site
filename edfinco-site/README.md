# EdFinco website

The marketing and lead-generation site for **EdFinco** (www.edfinco.com), an education-loan
assistance platform for Indian students going abroad. EdFinco is not a lender.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · CSS Modules · Postgres ·
Resend email · a Claude Code routine on Claude Pro for the blog writer · Lexend is the only typeface.

## What's in it

- **Public site:** home, about, consultation (two-step form), blog, legal pages.
- **Consultation requests:** stored in the database, assigned in turn to a team member who is
  emailed at once, copied to a Google Sheet ("Submitted" / "Partial"), worked in `/admin/leads`.
- **Blog automation:** Claude drafts each post, an admin approves it by email or in `/admin`
  (or requests changes), and only approved posts go live at the chosen time.
- **Dashboard (`/admin`):** consultation requests, blog, team & access (main-admin approval),
  my details, system check.

## Run it locally

```bash
npm install
npm run dev            # http://localhost:3000
```

No accounts are needed locally: an embedded database lives in `.data/pglite`, emails are saved to
`.data/outbox/`, the Google Sheet is written to `.data/sheets/*.csv`, and
`node scripts/dev-worker.mjs` plays the Claude writer. Create `.env.local` from `.env.example` and set
at least `MAIN_ADMIN_EMAILS` (any address; the sign-in link appears in `.data/outbox/`) and
`CRON_SECRET`. `.env.local` and `.data/` are git-ignored.

```bash
npm run build          # production build
npm run lint           # ESLint
npx tsc --noEmit       # type check
```

## Deploying

Hosted on **Render**: `../render.yaml` (repository root) is the Blueprint that creates the web
service and its Postgres database in Singapore. See **`docs/production-checklist.md`**: accounts,
every environment variable, go-live steps in order, and the content and legal items to finish
before launch. Service how-tos are in `docs/blog-automation-setup.md`.

## Where things are

| Area | Files |
|---|---|
| Page copy (single source) | `lib/content.ts` |
| Security headers / CSP | `next.config.ts`, `proxy.ts` |
| Database schema | `lib/server/schema.ts` (created automatically on first request) |
| Consultation requests | `app/api/consultation/*`, `lib/server/leads.ts`, `lib/server/lead-workflow.ts` |
| Google Sheet | `lib/server/sheets.ts`, `automation/google-sheet-apps-script.gs` |
| Blog automation | `lib/server/tick.ts`, `jobs.ts`, `workflow.ts`, `writer-instructions.ts`, `post-checks.ts` |
| Claude writer prompt | `automation/routine-prompt.md` |
| Sign-in and roles | `lib/server/auth.ts`, `lib/server/staff.ts` |
| Hourly scheduler | `../.github/workflows/blog-scheduler.yml` |
