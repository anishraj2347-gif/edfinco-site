// Database schema (Postgres). Idempotent: safe to run on every cold start. Wrapped in one
// transaction with an advisory lock so concurrent serverless instances can't race each other.
//
// Post lifecycle (posts.status):
//   writing         – a writer job is queued/running for this slot (no content yet)
//   pending_review  – a version is waiting for the admin (approval email sent)
//   revising        – the admin asked for changes; the writer is revising
//   approved        – live once publish_at <= now (the ONLY status the public site shows)
//   failed          – the writer could not finish; the admin can retry or reject
//   rejected        – the admin rejected it (never shown)
export const SCHEMA_SQL = `
BEGIN;
SELECT pg_advisory_xact_lock(727274001);

CREATE TABLE IF NOT EXISTS meta (
  key   text PRIMARY KEY,
  value text NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id                 integer PRIMARY KEY CHECK (id = 1),
  automation_enabled boolean NOT NULL DEFAULT false,
  publish_time       text    NOT NULL DEFAULT '07:00',
  review_lead_hours  integer NOT NULL DEFAULT 12 CHECK (review_lead_hours BETWEEN 1 AND 24),
  last_tick_at       timestamptz,
  tick_lock_until    timestamptz,
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         text
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS posts (
  id                     uuid PRIMARY KEY,
  slug                   text UNIQUE,
  status                 text NOT NULL,
  origin                 text NOT NULL DEFAULT 'automation',
  slot_at                timestamptz,
  publish_at             timestamptz,
  topic                  text,
  title                  text NOT NULL DEFAULT '',
  description            text NOT NULL DEFAULT '',
  tags                   jsonb NOT NULL DEFAULT '[]'::jsonb,
  image                  text,
  image_alt              text,
  body                   text NOT NULL DEFAULT '',
  sources                jsonb NOT NULL DEFAULT '[]'::jsonb,
  version                integer NOT NULL DEFAULT 0,
  checks                 jsonb,
  feedback               text,
  reminder_sent_at       timestamptz,
  published_notified_at  timestamptz,
  approved_at            timestamptz,
  approved_by            text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS posts_one_per_slot ON posts (slot_at) WHERE slot_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_status_publish ON posts (status, publish_at DESC);

CREATE TABLE IF NOT EXISTS post_versions (
  post_id     uuid    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  version     integer NOT NULL,
  title       text    NOT NULL,
  description text    NOT NULL,
  tags        jsonb   NOT NULL,
  body        text    NOT NULL,
  sources     jsonb   NOT NULL,
  feedback    text,
  checks      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, version)
);

-- Links in approval emails. Each token is bound to ONE version of ONE post; it only works while
-- that version is the latest and still awaiting review. Only hashes are stored.
CREATE TABLE IF NOT EXISTS review_tokens (
  token_hash text PRIMARY KEY,
  post_id    uuid    NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  version    integer NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id            uuid PRIMARY KEY,
  post_id       uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  kind          text NOT NULL,
  status        text NOT NULL,
  token_hash    text,
  token_expires timestamptz,
  attempts      integer NOT NULL DEFAULT 0,
  submissions   integer NOT NULL DEFAULT 0,
  fired_at      timestamptz,
  finished_at   timestamptz,
  session_url   text,
  last_error    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_status ON jobs (status, created_at);

CREATE TABLE IF NOT EXISTS topics (
  id         serial PRIMARY KEY,
  title      text NOT NULL UNIQUE,
  status     text NOT NULL DEFAULT 'open',
  post_id    uuid,
  position   integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash   text PRIMARY KEY,
  email        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash text PRIMARY KEY,
  email      text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  count        integer NOT NULL
);

-- Dashboard users added in /admin/team. The main admin(s) come from MAIN_ADMIN_EMAILS and are not
-- stored here. Anyone added by a non-main admin stays 'pending' until a main admin approves; only
-- 'active' members can receive a sign-in link.
CREATE TABLE IF NOT EXISTS staff (
  email        text PRIMARY KEY,
  role         text NOT NULL,
  status       text NOT NULL,
  name         text,
  note         text,
  requested_by text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_by   text,
  decided_at   timestamptz
);
-- Contact details for everyone with dashboard access (main admins included): shown in Team &
-- access, on assigned requests and in reminder emails. Access itself lives in "staff" / env.
CREATE TABLE IF NOT EXISTS staff_profiles (
  email      text PRIMARY KEY,
  name       text NOT NULL,
  phone      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);
-- Lead rotation: new consultation requests are assigned in turn to active members with
-- receives_leads on (the one assigned longest ago goes next).
ALTER TABLE staff ADD COLUMN IF NOT EXISTS receives_leads boolean NOT NULL DEFAULT true;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS last_lead_at timestamptz;

-- Consultation requests from /consultation (the team works these in /admin/leads).
-- No IP address or device data is stored; consent text + time are kept as the consent record.
CREATE TABLE IF NOT EXISTS leads (
  id                 uuid PRIMARY KEY,
  ref                text NOT NULL UNIQUE,
  status             text NOT NULL DEFAULT 'new',
  assigned_to        text,
  student_name       text NOT NULL,
  email              text NOT NULL,
  phone              text NOT NULL,
  destination        text NOT NULL,
  study_level        text NOT NULL,
  intake             text NOT NULL,
  co_borrower        text NOT NULL DEFAULT '',
  message            text NOT NULL DEFAULT '',
  consent_text       text NOT NULL,
  consent_at         timestamptz NOT NULL,
  source             text NOT NULL DEFAULT 'consultation-form',
  notified_at        timestamptz,
  notify_attempts    integer NOT NULL DEFAULT 0,
  confirmation_sent_at timestamptz,
  first_contacted_at timestamptz,
  reminder_sent_at   timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);
-- Two-step form: 'started' = step 1 sent (contact details + consent), 'partial' = left without
-- finishing step 2 for 30+ minutes, 'complete' = both steps (or the old one-step form).
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'complete';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS was_partial boolean NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS resume_token_hash text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS resume_expires timestamptz;
CREATE INDEX IF NOT EXISTS leads_status_created ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_stage ON leads (stage, created_at);
CREATE INDEX IF NOT EXISTS leads_email ON leads (lower(email));

CREATE TABLE IF NOT EXISTS lead_notes (
  id      serial PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  at      timestamptz NOT NULL DEFAULT now(),
  author  text NOT NULL,
  kind    text NOT NULL DEFAULT 'note',
  body    text NOT NULL
);
CREATE INDEX IF NOT EXISTS lead_notes_lead ON lead_notes (lead_id, at);

-- Outbox for the Google Sheet copy: every change is queued here and delivered in order, with
-- retries, so a temporary Google outage never loses a row.
CREATE TABLE IF NOT EXISTS sheet_outbox (
  id         serial PRIMARY KEY,
  ref        text NOT NULL,
  action     text NOT NULL,
  tab        text,
  row        jsonb,
  attempts   integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id      serial PRIMARY KEY,
  at      timestamptz NOT NULL DEFAULT now(),
  actor   text NOT NULL,
  action  text NOT NULL,
  post_id uuid,
  details jsonb
);

COMMIT;
`;
