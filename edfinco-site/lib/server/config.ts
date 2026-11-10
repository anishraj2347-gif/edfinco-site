// Server-only configuration, read from environment variables (see .env.example and
// docs/blog-automation-setup.md). Never import this from a client component — every value here
// stays on the server. Nothing secret is ever sent to the browser.

const isProd = process.env.NODE_ENV === "production";

function env(name: string): string {
  return (process.env[name] ?? "").trim();
}

function emailList(name: string): string[] {
  return env(name)
    .toLowerCase()
    .split(/[\s,;]+/)
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
}

function appUrl(): string {
  // Render sets RENDER_EXTERNAL_URL (https://<service>.onrender.com) itself, so a new Render site
  // links to its own address until APP_URL is set to the real domain.
  const raw =
    env("APP_URL") ||
    env("RENDER_EXTERNAL_URL") ||
    (isProd ? "https://www.edfinco.com" : "http://localhost:3000");
  const url = raw.replace(/\/+$/, "");
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(url);
  if (isProd && !url.startsWith("https://") && !local) {
    throw new Error("APP_URL must be an https:// URL in production.");
  }
  return url;
}

// The routine fire URL receives the routine token, so it must only ever point at Anthropic's
// API — a typo or a tampered env var can never send the token anywhere else.
function routineFireUrl(): string {
  const url = env("ROUTINE_FIRE_URL");
  if (!url) return "";
  return /^https:\/\/api\.anthropic\.com\/v1\/claude_code\/routines\/[A-Za-z0-9_-]+\/fire$/.test(url)
    ? url
    : "";
}

export const config = {
  isProd,
  appUrl: appUrl(),
  /** Postgres connection string (render.yaml sets DATABASE_URL; Neon/Vercel may set POSTGRES_URL). */
  databaseUrl: env("DATABASE_URL") || env("POSTGRES_URL"),
  /** Local escape hatch: allow the embedded dev database under `next start`. Never set on a host. */
  allowLocalDb: env("LOCAL_PGLITE") === "1",
  /**
   * The MAIN admin(s): always have full access and are the only ones who can approve new dashboard
   * users. Everyone else is added in /admin/team and stays pending until a main admin approves.
   * (ADMIN_EMAILS is accepted as an older name for the same setting.)
   */
  mainAdminEmails: emailList("MAIN_ADMIN_EMAILS").length ? emailList("MAIN_ADMIN_EMAILS") : emailList("ADMIN_EMAILS"),
  resendApiKey: env("RESEND_API_KEY"),
  emailFrom: env("EMAIL_FROM") || "EdFinco <onboarding@resend.dev>",
  /** Claude Code routine (runs on the owner's Claude Pro plan) — API trigger "fire" endpoint. */
  routineFireUrl: routineFireUrl(),
  routineFireToken: env("ROUTINE_FIRE_TOKEN"),
  /** Shared secret for the scheduler tick (GitHub Actions / cron service → /api/automation/tick). */
  cronSecret: env("CRON_SECRET"),
  /** Google Sheet copy of consultation requests (Apps Script web app in the owner's Sheet). */
  sheetsWebhookUrl: sheetsUrl(),
  sheetsWebhookSecret: env("SHEETS_WEBHOOK_SECRET"),
} as const;

// The Sheet URL receives the shared secret, so it may only be a Google Apps Script web app.
function sheetsUrl(): string {
  const url = env("SHEETS_WEBHOOK_URL");
  return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url) ? url : "";
}

export const sheetsConfigured = (): boolean =>
  Boolean(config.sheetsWebhookUrl && config.sheetsWebhookSecret.length >= 16);

export const writerConfigured = (): boolean => Boolean(config.routineFireUrl && config.routineFireToken);
export const emailConfigured = (): boolean => Boolean(config.resendApiKey);
