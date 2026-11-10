# EdFinco website — production handover checklist

Everything in this project is configured through **environment variables**: no password, key or
email address is written into the code. The values used while building it (the `admin@edfinco.test`
login, the local database in `.data/`, `.env.local`) stay on the developer's computer: git ignores
them, so nothing from testing reaches production. For go-live, the **client creates their own
accounts** below and puts their own values into the hosting settings.

Detailed how-tos for each service: `docs/blog-automation-setup.md`.

## 1. Accounts the client needs

| Service | What it's for | Cost |
|---|---|---|
| **GitHub** (private repository) | Holds the code; runs the free hourly check (`.github/workflows/blog-scheduler.yml`) | Free |
| **Hosting** for Next.js | Runs the website | Vercel's free plan is non-commercial only: use **Vercel Pro (~US$20/month)** or a host whose free tier allows business use (e.g. Netlify) |
| **Neon** Postgres (via Vercel → Storage, or neon.tech) | Database: blog posts, consultation requests, team, settings | Free plan |
| **Resend** + access to **edfinco.com DNS** | Sends all emails (approvals, team alerts, sign-in links, student confirmations) | Free plan (3,000 emails/month) |
| **Claude Pro** (claude.ai) | The blog writer: a Claude Code routine on the client's own plan | Included in Pro; no API key |
| **Google account** | The Google Sheet copy of consultation requests | Free |

## 2. Environment variables (host → Settings → Environment Variables)

| Variable | Required | What to put |
|---|---|---|
| `APP_URL` | Yes | `https://www.edfinco.com` (must be https) |
| `DATABASE_URL` | Yes | Neon **pooled** connection string (set automatically by Vercel's Neon integration) |
| `MAIN_ADMIN_EMAILS` | Yes | The owner's email: the main admin (full access; the only one who approves new people) |
| `RESEND_API_KEY` | Yes | Resend → API Keys |
| `EMAIL_FROM` | Yes | e.g. `EdFinco <notifications@edfinco.com>` (domain verified in Resend) |
| `CRON_SECRET` | Yes | A long random secret, also saved as the GitHub Actions secret `CRON_SECRET` |
| `ROUTINE_FIRE_URL` | For the blog | claude.ai/code/routines → the writer routine → API trigger URL |
| `ROUTINE_FIRE_TOKEN` | For the blog | The token shown once when adding that API trigger |
| `SHEETS_WEBHOOK_URL` | For the Sheet | The Apps Script web app URL (`https://script.google.com/macros/s/…/exec`) |
| `SHEETS_WEBHOOK_SECRET` | For the Sheet | A long random secret, also pasted into the Apps Script `SECRET` line |

Generate each secret with:
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

**Never set** `ANTHROPIC_API_KEY` (not used; the blog runs on Claude Pro) or `LOCAL_PGLITE`
(local testing only). After changing variables, redeploy.

## 3. Go-live steps, in order

1. **Code:** push this repository to the client's private GitHub.
2. **Host:** import the repo; **root directory `edfinco-site`**; Node 20.9 or newer (declared in
   `package.json`). Add the variables from section 2 that you have so far.
3. **Database:** connect Neon (`DATABASE_URL`). Deploy. Open `/blog` once: the tables are created
   automatically and the three launch articles plus the topic list are imported.
4. **Domain:** point `www.edfinco.com` (and `edfinco.com`) at the new host. *This replaces the
   current Google Sites website.* Do it only once section 4 below is complete.
5. **Email:** verify `edfinco.com` in Resend (DNS records), set `RESEND_API_KEY` + `EMAIL_FROM`.
6. **Sign in:** `https://www.edfinco.com/admin` → main admin email → link in the inbox.
   *Dashboard → Blog → System check* should show ✓ for everything set so far.
7. **My details:** click your email in the top bar and add your name and phone.
8. **Team:** *Team & access* → add each team member (name, email, phone; *Team* role). New
   consultation requests are assigned to them in turn.
9. **Google Sheet:** follow "Google Sheet" in `docs/blog-automation-setup.md`, set the two
   variables, redeploy, then *Consultation requests → Copy all to Google Sheet*.
10. **Claude writer:** in claude.ai create the environment (Custom network: `www.edfinco.com`),
    the routine (prompt in `automation/routine-prompt.md`) and its API trigger; set the two
    variables; redeploy. If the site isn't on `https://www.edfinco.com`, change that address in
    the routine prompt.
11. **Hourly check:** GitHub → Settings → Secrets and variables → Actions: variable `SITE_URL`,
    secret `CRON_SECRET`. Actions → *Blog scheduler* → *Run workflow* once.
12. **Blog:** *Dashboard → Blog* → set the posting time and email lead time → *Turn automation on*
    → optionally *Write the next draft now* to receive the first approval email.
13. **End-to-end test:** submit the consultation form → the assigned team member gets the email →
    the request appears in the dashboard and the Sheet. Then delete the test request.

## 4. Before launch: content and legal (owner / lawyer)

These are visible on the site today as `[Owner action required: …]` placeholders or flagged copy.
They're business and legal decisions, not code.

- [ ] **Privacy policy, Terms, Disclaimer:** a qualified lawyer completes every placeholder
      (registered address, retention period and deletion process, data rights and how to use them,
      grievance officer, service providers, governing law) and removes the "template" notices.
- [ ] **Registered name:** if EdFinco is a company or LLP, the footer and legal pages need the full
      registered name (e.g. "… Private Limited"), and usually the CIN and registered address.
- [ ] **Fees:** confirm who charges what, so "at no extra cost" and any processing-fee mention agree.
      (The blog writer is blocked from the processing-fees topic until then.)
- [ ] **Lenders:** confirm EdFinco really works with the lender types the site mentions (public and
      private banks, NBFCs, international lenders).
- [ ] **Disclosure:** lawyer's view on disclosing that lenders pay EdFinco (DSA commission) next
      to the "free consultation" wording.
- [ ] **Partial leads:** lawyer to confirm the two-step form wording ("we may contact you even if you
      don't finish") meets the DPDP Act for keeping step-1 details.
- [ ] **Contact details:** `hello@edfinco.com` and the Instagram link in `lib/content.ts` are the
      right public contacts.

## 5. After launch: keeping it healthy

- **System check** (Dashboard → Blog) should stay all ✓; "Scheduler last ran" under an hour.
- **People leaving:** remove them in *Team & access* (signs them out at once). If anyone who saw
  a secret leaves, generate a new one, update it in the host (and GitHub / the Apps Script), and redeploy.
- **Claude writer:** runs use the client's Pro allowance. If a run can't start (allowance used up,
  subscription lapsed), the website retries and emails a "writer problem". The routine API trigger is
  an Anthropic beta: if it changes, the fallback is GitHub Actions with `claude setup-token`
  (see `docs/blog-automation-setup.md` → Troubleshooting).
- **Data:** the Google Sheet and *Export CSV* are extra copies of the consultation requests.
  Data-erasure requests: delete the request in the dashboard (it's removed from the Sheet too).

## 6. Security summary (for the client's IT)

- Strict Content-Security-Policy with per-request nonces; HSTS, frame, MIME and referrer headers.
- No secrets in the browser; every key is a server-side environment variable.
- Same-origin checks on every form and admin action; no CORS; request size limits; rate limits on
  sign-in, review links and the consultation form; bot trap; no IP addresses stored.
- Passwordless sign-in (single-use 15-minute links), HttpOnly + Secure + SameSite session cookies
  (`__Host-` prefix), roles re-checked on every request, main-admin approval for new users.
- All tokens (sign-in, approval links, writer jobs, sessions) are random and stored only as hashes.
- Every database query is parameterised; blog Markdown never renders raw HTML; spreadsheet
  formula injection is neutralised in the CSV export and the Google Sheet.
- `npm audit`: 0 known vulnerabilities at handover.
