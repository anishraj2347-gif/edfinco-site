# EdFinco website: security audit report

| | |
|---|---|
| Date | 2026-11-19 |
| Target | `edfinco-site/` (Next.js 16.4.5, React 19.3.0, Postgres), `render.yaml`, `.github/workflows/blog-scheduler.yml`, `edfinco-site/automation/google-sheet-apps-script.gs` |
| Source ref | `main` at `cf84029` plus **uncommitted** working-tree changes (the remediation from earlier in this session is included) |
| Method | Full source review of every route handler, server library, admin/review page and client component that handles data; dependency audit; local regression tests against transpiled server code and an in-memory Postgres (PGlite). No deployed system, external service or real data was touched. |

---

## 1. Executive summary

**Overall posture: good.** The application was clearly built with security in mind:
- Admin sign-in is passwordless: hashed, single-use email links.
- Sessions use `__Host-`, HttpOnly, Secure, SameSite=Lax cookies, and role is re-checked against the database on every request.
- Every state-changing endpoint checks the request's origin (CSRF protection).
- Every SQL query is parameterised.
- No raw HTML is ever rendered.
- The Content Security Policy uses a per-request nonce with `strict-dynamic`.
- Outbound secrets can only be sent to fixed hosts.
- `npm audit` reports 0 known vulnerabilities.

**No critical or high-severity issue was found.** No authentication bypass, IDOR, SQL injection or stored XSS was found.

| Severity | Count | IDs |
|---|---|---|
| Critical | 0 | |
| High | 0 | |
| Medium | 1 | SEC-001 |
| Low | 5 | SEC-002, SEC-004, SEC-005, SEC-006, SEC-007 |
| Informational | 4 | SEC-003, SEC-008, SEC-009, SEC-010 |

**Most important findings**
1. **SEC-001: per-IP rate limits trust client-supplied IP headers.** Render's default `*.onrender.com` address can be reached without going through Cloudflare. There an attacker controls `CF-Connecting-IP`, so the per-IP limits do nothing. The site-wide caps added this session limit the volume, but an attacker can still use them up. That locks real visitors out of the form for the hour and can exhaust the email provider's daily quota, which stops admin sign-in links from being sent.
2. **SEC-002: consultation-request takeover in step 1 is still open.** The fix applied earlier this session landed in the wrong function (`createLead` instead of `startLead`). A local test confirms the takeover still works (see SEC-002 and SEC-003).

**Architectural weaknesses**
- The client IP is derived from headers whose trustworthiness depends on the hosting edge. The repository can't enforce that edge.
- The consultation form has no bot challenge, so rate limits are the only defence against automated abuse.

**Immediate priorities**
1. Make the origin reachable only through Cloudflare, or authenticate Cloudflare to the app (SEC-001).
2. Move the step-1 dedupe fix to `startLead` and revert the misplaced change (SEC-002 and SEC-003).

**Limitations:** Render, Cloudflare, Resend, Google Apps Script deployment, GitHub repository settings and database role privileges are not in the repository and were **not verified** (see §7).

---

## 2. Architecture and attack surface

**Components**
- **Public site:** home, about, blog (posts stored in Postgres), legal pages, and a consultation form (two-step: `/api/consultation/start`, then `/api/consultation`; the one-step payload is still accepted).
- **Admin dashboard (`/admin/*`):**
  - roles: *main admin* (from the `MAIN_ADMIN_EMAILS` env var), *admin* and *team*, stored in the `staff` table
  - team members see only consultation requests
  - only main admins can approve, remove or change the role of users, and connect the writer
- **Review links (`/review/<token>`):** emailed bearer links that let the holder chat with the AI writer and approve a draft without signing in.
- **Writer API (`/api/automation/jobs/<id>`):** called by the owner's Claude Code routine with a per-job bearer token (3-hour lifetime, hashed at rest).
- **Scheduler (`/api/automation/tick`):** GitHub Actions calls it hourly with `CRON_SECRET`.
- **Outbound calls:**
  - Resend (email)
  - Anthropic routine trigger (URL pinned by regex)
  - Google Apps Script web app (URL pinned by regex, shared secret in the request body)
- **Hosting:** Render web service plus Render Postgres (`render.yaml`), with Cloudflare in front (according to code comments).

**Trust boundaries**

| Boundary | Control |
|---|---|
| Internet → public endpoints | origin check, JSON size cap, field validation, honeypot, rate limits |
| Internet → admin | email-link sign-in, then session cookie, then `guardAdminPost` / `guardStaffPost` / `requireAdmin` |
| Team → admin | `role === "admin"` checked server-side (in route handlers and in `staff.ts`) |
| Admin → main admin | `isMain` checked server-side (`team`, `writer` routes; `staff.ts`) |
| Review link holder → publication | 256-bit token; acts only on the current version while it is awaiting review |
| Writer (AI) → site content | per-job token; `parseSubmission` + `checkPost` validation; human approval required before publishing |
| App → third parties | fixed URLs, secrets only from env vars or encrypted in the DB |

**Untrusted inputs → sensitive sinks:**
- form fields → database (parameterised) and emails (HTML-escaped)
- writer Markdown → blog (React elements; links filtered by `safeHref`)
- lead data → CSV export (formula-neutralised) and Google Sheet (cells forced to text)
- headers → rate-limit keys (SEC-001)

---

## 3. Vulnerability findings

### SEC-001: Per-IP rate limits are keyed on client-controlled headers

- **Severity:** Medium. CVSS v4.0 ≈ 5.3: AV:N/AC:L/AT:P/PR:N/UI:N/VC:N/VI:L/VA:L/SC:N/SI:N/SA:L. AT:P because the attack needs the origin to be directly reachable.
- **Confidence:** Confirmed (header trust reproduced locally). Whether the origin is directly reachable is **unverified** (deployment).
- **Affected files:**
  - `edfinco-site/lib/server/http.ts:57-65` (`clientIp`)
  - `edfinco-site/app/review/[token]/page.tsx:28` (reads `x-forwarded-for` directly)
  - every caller of `clientIp`: `app/api/consultation/route.ts`, `app/api/consultation/start/route.ts`, `app/api/admin/login/route.ts`, `app/api/admin/login/verify/route.ts`, `app/api/review/[token]/route.ts`, `app/api/review/[token]/status/route.ts`
- **Description:** On Render, `clientIp` returns `CF-Connecting-IP` if present, otherwise the first `X-Forwarded-For` entry. Both are visitor-controlled whenever a request reaches Render without passing through Cloudflare, e.g. at the default `<service>.onrender.com` hostname. The code comment itself notes that Render keeps a visitor-supplied `X-Forwarded-For`.
- **Root cause:** Trusting a proxy header without proving the request came through that proxy.
- **Attack preconditions:**
  - no authentication
  - the origin hostname is reachable directly (Render's default)
- **Attack scenario:** A script posts to `https://<service>.onrender.com/api/consultation/start` and `/api/consultation` with a random `CF-Connecting-IP` and a different victim email on each request. Each request passes the per-IP and per-email limits.
- **Impact:**
  - Every completed request emails the team **and** sends a confirmation to the address the attacker typed in (`lib/server/lead-workflow.ts:52,60`). That is spam sent from your domain to third parties.
  - The site-wide caps added this session (`consult-global` 100/h, `login-global` 60/h) bound the volume. However, 100 requests/hour can produce about 200 emails/hour, which is above the Resend free tier's daily limit. Once the quota is gone, **admin sign-in links stop sending** (`api/admin/login`).
  - The attacker can also deliberately fill the global cap, which blocks real students from the form for up to an hour.
  - The per-IP brute-force limits on `login/verify` and `review` are bypassed too. The token space is 256 bits, so that has no practical impact.
- **Evidence (local tests):**
  - `PASS | SPOOF: on Render a client-sent CF-Connecting-IP is trusted verbatim`
  - `PASS | SPOOF: without CF header, first X-Forwarded-For entry is used`
  - `PASS | RATE: global cap blocks the 101st call`
- **Mitigating controls:** the site-wide caps (uncommitted), the per-email caps, and the honeypot field.
- **Recommended fix:**
  - (a) Prove the request came through Cloudflare. Add a Cloudflare Transform Rule that sets a secret header (e.g. `X-Edge-Auth`). In `proxy.ts`, or in `clientIp` / the public POST handlers, reject or rate-limit as a single bucket any request missing that header.
  - (b) Add a bot challenge (Cloudflare Turnstile, verified server-side) to both consultation steps.
  - (c) Make `app/review/[token]/page.tsx` use `clientIp`, for consistency.
  - (d) Optionally send the student confirmation email only after step 2, and at most once per address per day.
- **Regression test:** A request to the consultation and login endpoints without the edge-auth header returns 403 (or lands in a single shared bucket). `clientIp` ignores `CF-Connecting-IP` when the edge-auth header is missing.

### SEC-002: Consultation request can be taken over in step 1 by anyone who knows the email and phone

- **Severity:** Low. CVSS v4.0 ≈ 2.1: AV:N/AC:L/AT:P/PR:N/UI:N/VC:L/VI:L/VA:L/SC:N/SI:N/SA:N.
- **Confidence:** Confirmed (local test).
- **Affected files:** `edfinco-site/lib/server/leads.ts:204-219` (`startLead`, the `recent` branch)
- **Description:** When step 1 arrives with an email and phone that match a request created in the last 30 minutes, `startLead` issues a **new** resume token for that existing request and returns it, together with the request's reference, to whoever submitted it. The matching request can be in **any** stage, including complete.
  - The victim's own token is overwritten, so their step 2 fails with "expired".
  - The attacker can then submit step 2 and overwrite the victim's destination, study level, intake, co-borrower and message.
- **Root cause:** Dedupe logic treats "knows email and phone" as proof of identity, and doesn't check the request's stage.
- **Attack preconditions:**
  - the victim's email and phone
  - acting within 30 minutes of the victim starting the form
- **Impact:**
  - integrity of one student's request
  - denial of their step 2
  - disclosure of their reference number
- **Evidence:** `PASS | LEAD: same email+phone while victim is UNFINISHED (<30 min) takes over the resume token`. `FAIL | LEAD: same email+phone after COMPLETION does not reopen the victim's request`: the completed request is still returned, which proves the earlier fix is not in effect.
- **Recommended fix:**
  - Add `AND stage IN ('started','partial')` to the `recent` query in `startLead`.
  - Preferably, stop handing an existing request's token to a new caller: create a new request and let staff merge duplicates. Or keep the old token valid and attach the new submission as a note.
- **Regression test:** The two `LEAD:` cases in the harness (§7). After the fix, both the "completed" case and (if the stronger fix is chosen) the "unfinished" case must not reuse the victim's request.

### SEC-003: Earlier remediation landed in the wrong function and causes duplicate requests (regression)

- **Severity:** Informational (functional regression with a small abuse angle). **Confidence:** Confirmed (`git diff`).
- **Affected files:** `edfinco-site/lib/server/leads.ts:122` (`createLead`)
- **Description:** This session's fix for SEC-002 added `AND stage IN ('started','partial')` to `createLead`, the one-step path, instead of `startLead`.
  - `createLead` intentionally deduped resubmissions of **complete** requests within 30 minutes. It now creates a new request each time.
  - Each duplicate triggers a team alert and a student confirmation email.
- **Recommended fix:** Revert that line in `createLead`, and apply it to `startLead` (SEC-002).
- **Regression test:** Two identical one-step submissions within 30 minutes produce one request (`duplicate: true` the second time).

### SEC-004: `/\host` links pass the same-site link and redirect checks but leave the site

- **Severity:** Low. CVSS v4.0 ≈ 1.9: needs a malicious or manipulated writer submission **and** admin approval.
- **Confidence:** Confirmed (local test).
- **Affected files:**
  - `edfinco-site/lib/markdown.ts:101-105` (`safeHref`)
  - `edfinco-site/lib/server/http.ts:24-27` (`seeOther`)
  - `edfinco-site/lib/server/post-checks.ts:127-129` (uses `safeHref`)
- **Description:** `/^\/(?!\/)/` accepts `/\evil.test`. Browsers normalise the backslash, so `new URL("/\\evil.test", "https://www.edfinco.com").host === "evil.test"`.
  - A writer submission containing `[guide](/\evil.test)` passes `checkPost`. It is rendered as an *internal* link: no `target=_blank`, no `rel=noopener`, and it doesn't look external to a reviewer.
  - `seeOther` has the same gap, but every current caller passes constants or encoded values, so no reachable open redirect exists today.
- **Attack preconditions:** Influence over the AI writer's output, e.g. through review-chat feedback (needs a review link) or prompt injection via a topic. An admin must then approve the post.
- **Impact:** A published blog link pointing to an attacker's site that looks like a same-site link. Possible phishing of readers.
- **Evidence:**
  - `PASS | REDIRECT: '/\evil.test' accepted as INTERNAL link but resolves off-site`
  - `PASS | REDIRECT: seeOther('/\evil.test') emits off-site Location`
- **Recommended fix:** Reject `\` in internal paths in both helpers: `/^\/(?![\/\\])[^\\]*$/`.
- **Regression test:** `safeHref("/\\evil.test") === null`; `seeOther("/\\x").headers.get("location") === "/"`.

### SEC-005: The sign-in form's response time reveals which emails have dashboard access

- **Severity:** Low. CVSS v4.0 ≈ 2.3: VC:L.
- **Confidence:** High confidence (complete code path; not timed against a live server).
- **Affected files:** `edfinco-site/app/api/admin/login/route.ts:31-38`
- **Description:** The response body is identical for every address, but for staff addresses the handler **awaits** the token insert, the Resend API call and the audit write before replying. For other addresses it replies immediately. That difference, typically hundreds of milliseconds, is measurable.
- **Attack preconditions:** None (unauthenticated). The limits are 10/h per IP (bypassable via SEC-001), 5/h per email and 60/h site-wide.
- **Impact:** Confirms which staff emails can sign in, which is useful for targeted phishing. It does not grant access by itself.
- **Recommended fix:** Send the link after the response, inside `after(() => …)`, so both paths take the same time. Keep the rate-limit checks before the reply.
- **Regression test:** The handler returns before `sendEmail` resolves (mock `sendEmail` with a delay and assert the response time).

### SEC-006: Review links are bearer credentials that can approve publication

- **Severity:** Low (accepted design risk). **Confidence:** Confirmed.
- **Affected files:**
  - `edfinco-site/lib/server/posts.ts:235-264`
  - `edfinco-site/app/api/review/[token]/route.ts:37-43`
- **Description:**
  - Anyone holding an approval email link can approve the post, or start revisions, without signing in, for 3 days. This was reduced from 7 days this session.
  - The link covers **every later version** of that post. `tokenVersion` is returned but never compared.
  - Forwarded emails, shared inboxes, or mail-security tools that store URLs widen who can approve.
- **Mitigating controls:**
  - 256-bit token, hashed at rest
  - actions need a POST that passes the origin check
  - actions apply only to the current version while it is awaiting review
  - the review page sets `noindex` and `referrer: same-origin`
  - every approval is logged as "approval email link"
- **Recommended fix (if the business wants more assurance):** Make the link view-and-chat only and require a dashboard session to approve. Or bind approval to the version the link was issued for (`version === tokenVersion`).
- **Regression test:** A POST `action=approve` with a token for v1 against a post now at v2 returns 409 (if version binding is chosen).

### SEC-007: Attacker-chosen text can be shown as an error message in the admin dashboard

- **Severity:** Low. **Confidence:** Confirmed (code path).
- **Affected files:** `edfinco-site/app/admin/page.tsx:91,102` (`?error=`), plus similar `error` / `warn` query handling on other admin pages.
- **Description:** `/admin?error=<text>` renders up to 200 attacker-chosen characters inside the trusted dashboard's error box. React escapes it, so this is **not XSS**, but an attacker could send an admin a link that shows, for example, "Session expired, re-enter your details at …".
- **Attack preconditions:** The admin clicks a crafted link while signed in.
- **Recommended fix:** Use message codes, as the `msg` parameter already does (`MESSAGES[q.msg]`), and map error codes to fixed strings.
- **Regression test:** `/admin?error=anything` shows a generic message or nothing.

### SEC-008: Login CSRF: someone can be signed into an attacker's staff account

- **Severity:** Informational. **Confidence:** Confirmed (code path).
- **Affected files:**
  - `edfinco-site/app/admin/login/verify/page.tsx`
  - `edfinco-site/app/api/admin/login/verify/route.ts`
- **Description:** A staff member who is also an attacker can send someone their own sign-in link. If the victim clicks "Sign in", the victim's browser now carries the attacker's session. The attacker already has staff access, and the victim would see the attacker's identity in the header, so the gain is negligible.
- **Recommended fix:** None required. Optionally show "You are signing in as <email>" on the confirmation page.

### SEC-009: Writer token encryption key migration is incomplete until the writer is reconnected

- **Severity:** Informational. **Confidence:** Confirmed.
- **Affected files:** `edfinco-site/lib/server/writer-connection.ts:50-66,81-94`
- **Description:** After this session's change, tokens already saved under the `CRON_SECRET`-derived key are still decrypted. `CRON_SECRET` is also stored in GitHub Actions, so someone who obtains both a database dump and that GitHub secret can recover the routine token. This stays true until the writer is reconnected with `SECRETS_KEY` set.
- **Recommended fix:** Reconnect the writer once after deploying. Optionally remove the legacy decrypt key in a later release.

### SEC-010: Setting `LOCAL_PGLITE=1` in production would write login links to the server disk

- **Severity:** Informational (configuration hazard). **Confidence:** Confirmed (code path).
- **Affected files:**
  - `edfinco-site/lib/server/email.ts:48-58`
  - `edfinco-site/lib/server/db.ts:63-72`
  - `edfinco-site/lib/server/config.ts:51`
- **Description:** With `LOCAL_PGLITE=1` and no Resend key, production stores emails (including live sign-in links) as files in `.data/outbox` and uses an embedded database on the instance disk. The code marks this as a local escape hatch, but nothing blocks it on a host.
- **Recommended fix:** Refuse to start in production when `LOCAL_PGLITE=1` and `RENDER` (or any host marker) is set.

---

## 4. Attack chain analysis

| Chain | Steps | Preconditions | Combined impact |
|---|---|---|---|
| A. Quota exhaustion → admin lockout | SEC-001 (spoof IP on onrender.com) → consultation form sends ~2 emails per request → provider quota exhausted → `/api/admin/login` can't send links | origin reachable directly | Staff can't sign in until the quota resets. Spam from your domain may damage its sender reputation. |
| B. Enumeration → phishing | SEC-001 (bypass per-IP limit) → SEC-005 (timing) → SEC-007 (link showing fake error text) | none / an admin clicks | Targeted phishing of confirmed staff with a credible message inside the dashboard. No credential exists to steal (passwordless), so the realistic aim is social engineering. |
| C. Writer manipulation → off-site link | review link holder (SEC-006) asks for a change that adds `/\evil` (SEC-004) → approves with the same link | a review link | An off-site link published in a blog post with **no** dashboard sign-in. Only the review-link holder needs to act. |

No chain was found that reaches admin sessions, other leads' data, or code execution.

---

## 5. Security coverage matrix

| Category | Status | Findings | Validation |
|---|---|---|---|
| Authentication (email links, sessions, logout) | Reviewed | SEC-005, SEC-008 | Static + tested (single-use token race) |
| Authorization (admin/team/main, route + page guards) | Reviewed: all 15 admin route handlers, all 9 admin pages | none | Static (complete code paths) |
| CSRF / origin checks | Reviewed | none | Tested (`isSameOrigin`) |
| Injection: SQL | Reviewed: all queries parameterised; `whereFor` interpolates only constants | none | Static |
| Injection: XSS / HTML | Reviewed: no `dangerouslySetInnerHTML` except escaped JSON-LD; Markdown → React; emails escaped | SEC-004 | Static + tested (`safeHref`) |
| Injection: CSV / Sheet formulas, email headers | Reviewed | none | Static |
| Command / path traversal / deserialization | Reviewed: no shell; file writes only to fixed dev paths with generated names | none | Static |
| API security (writer, tick, review, consultation) | Reviewed | SEC-001, SEC-002, SEC-006 | Static + tested |
| Rate limiting | Reviewed | SEC-001 | Tested |
| SSRF / outbound | Reviewed: Anthropic, Apps Script and Resend URLs pinned | none | Static |
| Frontend / browser (CSP, headers, storage, postMessage) | Reviewed | SEC-007 | Static |
| Database / data (hashing, encryption, retention) | Reviewed: tokens SHA-256-hashed; writer token AES-256-GCM; lead PII plaintext (expected) | SEC-009 | Static |
| File upload | Not applicable: no upload feature | none | n/a |
| Secrets / configuration | Reviewed: no committed secrets; `.env*` ignored | SEC-009, SEC-010 | Static |
| Dependencies | Reviewed | none | `npm audit`: 0 vulnerabilities (next 16.4.5, react 19.3.0, postgres 3.4.9) |
| CI/CD | Reviewed: workflow has `permissions: {}`, no untrusted input interpolation | none | Static |
| Infrastructure (Render, Cloudflare, TLS, DB role) | Partial: only `render.yaml` in the repo | SEC-001 | Unverified |
| Business logic (approval workflow, lead workflow, job lifecycle) | Reviewed | SEC-002, SEC-003, SEC-006 | Static + tested |

---

## 6. Remediation roadmap

- **P0 (now):**
  - Fix SEC-002 in `startLead` and revert the misplaced SEC-003 line.
  - Confirm `SECRETS_KEY` exists on Render, then reconnect the writer (SEC-009).
- **P1 (this week):**
  - SEC-001: authenticate Cloudflare to the origin (Transform Rule header plus a check in the app) or block direct `onrender.com` access.
  - Add Turnstile to the consultation form.
  - Switch the review page to `clientIp`.
- **P2 (hardening):**
  - SEC-004: tighten `safeHref` / `seeOther`.
  - SEC-005: send the sign-in email in `after()`.
  - SEC-007: use error codes instead of free-text errors.
- **P3 (longer term):**
  - SEC-006: require a session to approve, or bind approval to the link's version.
  - SEC-010: refuse `LOCAL_PGLITE` on hosts.
  - Run schema migrations with a separate database role, so the runtime role doesn't need DDL rights.
  - Add the local harness checks to the repository as real tests (there is no test suite today).

---

## 7. Unverified risks and audit limitations

- **Deployment not inspected:**
  - Render service settings (custom domains, whether `onrender.com` is reachable)
  - Cloudflare rules, TLS mode and WAF
  - the Resend domain and its SPF/DKIM/DMARC records
  - the Postgres role's privileges (the app runs DDL at startup, so it likely owns the schema)
  - the backup policy
  - the GitHub repository's branch protection and secret access
  - the Apps Script deployment's owner and sharing
  - the claude.ai routine's own permissions
- **The AI writer is treated as semi-trusted.** Its output is validated and needs human approval. Prompt-injection behaviour of the routine itself was not tested.
- **Dynamic testing was limited** to pure functions and SQL run on in-memory PGlite. The test harness and its results are in the session scratchpad: `C:\Users\KRYPTI~1\AppData\Local\Temp\claude\beb0f509f2c8ffc7\3d560d0a-d336-45e2-b0b0-01fb92a30dc7\scratchpad\sec\test.cjs`.
  - Results: 16 PASS, 1 FAIL. The FAIL is the SEC-002 check, which is evidence that the issue is open.
  - The full Next.js server, the browser CSP and the cookie behaviour were not exercised end-to-end.
- **`npm audit` reflects the advisory database on the audit date only.**
- **The review covers the current working tree, including uncommitted changes.** Re-check after those are committed or changed.
- This report does not show the application is secure. It records what was examined and found.
