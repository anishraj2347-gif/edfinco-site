// The AI writer connection. The writer is a Claude Code ROUTINE in the owner's own claude.ai
// account, running on their Claude Pro plan (no API key, no AI cost). The owner signs in to Claude
// on claude.ai itself — Anthropic does not allow third-party sites to offer claude.ai login — and
// connects the routine here with its API-trigger URL + token, either in /admin/writer (stored
// encrypted in the database) or as ROUTINE_FIRE_URL / ROUTINE_FIRE_TOKEN env vars (these win).
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import type { Db } from "./db";
import { config } from "./config";

/** The token may only ever be sent to Anthropic's routine trigger endpoint. */
export const FIRE_URL_RE = /^https:\/\/api\.anthropic\.com\/v1\/claude_code\/routines\/[A-Za-z0-9_-]+\/fire$/;
const TOKEN_OK = /^[\x21-\x7E]{20,512}$/;

export interface Writer {
  url: string;
  token: string;
  source: "env" | "dashboard";
}

export interface WriterStatus {
  connected: boolean;
  source: "env" | "dashboard" | null;
  /** The routine id from the URL (not secret), so the admin can tell which routine is connected. */
  routineId: string | null;
  tokenHint: string | null;
  connectedBy: string | null;
  connectedAt: Date | null;
  lastTestAt: Date | null;
  lastTestOk: boolean | null;
  lastTestDetail: string | null;
  lastTestSession: string | null;
  /** True when a saved connection exists but can't be decrypted (the key changed): reconnect. */
  needsReconnect: boolean;
  /** False in production when no encryption key is configured, so nothing can be saved here. */
  canSave: boolean;
}

interface Row {
  fire_url: string;
  token_enc: string;
  token_hint: string;
  connected_by: string | null;
  connected_at: Date;
  last_test_at: Date | null;
  last_test_ok: boolean | null;
  last_test_detail: string | null;
  last_test_session: string | null;
}

function key(): Buffer | null {
  const secret = (process.env.SECRETS_KEY ?? "").trim() || config.cronSecret;
  if (secret.length >= 16) return Buffer.from(hkdfSync("sha256", secret, "edfinco", "writer-connection-v1", 32));
  // Local development only: a fixed key so the page works on a laptop without extra setup.
  return config.isProd ? null : Buffer.from(hkdfSync("sha256", "local-dev-only-key", "edfinco", "writer-connection-v1", 32));
}

function encrypt(plain: string): string | null {
  const k = key();
  if (!k) return null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

function decrypt(box: string): string | null {
  const k = key();
  const [v, iv, tag, ct] = box.split(".");
  if (!k || v !== "v1" || !iv || !tag || !ct) return null;
  try {
    const d = createDecipheriv("aes-256-gcm", k, Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

async function row(db: Db): Promise<Row | null> {
  const rows = await db.query<Row>(
    `SELECT fire_url, token_enc, token_hint, connected_by, connected_at, last_test_at, last_test_ok,
            last_test_detail, last_test_session
     FROM writer_connection WHERE id = 1`
  );
  return rows[0] ?? null;
}

/** The connected writer, or null if none. Env vars take precedence over the dashboard setting. */
export async function getWriter(db: Db): Promise<Writer | null> {
  if (config.routineFireUrl && config.routineFireToken) {
    return { url: config.routineFireUrl, token: config.routineFireToken, source: "env" };
  }
  const r = await row(db);
  if (!r || !FIRE_URL_RE.test(r.fire_url)) return null;
  const token = decrypt(r.token_enc);
  return token ? { url: r.fire_url, token, source: "dashboard" } : null;
}

export async function writerStatus(db: Db): Promise<WriterStatus> {
  const r = await row(db);
  const w = await getWriter(db);
  const routineId = (url: string | undefined) => url?.match(/routines\/([A-Za-z0-9_-]+)\/fire$/)?.[1] ?? null;
  return {
    connected: Boolean(w),
    source: w?.source ?? null,
    routineId: routineId(w?.url ?? r?.fire_url),
    tokenHint: w?.source === "env" ? `...${config.routineFireToken.slice(-4)}` : r ? `...${r.token_hint}` : null,
    connectedBy: w?.source === "dashboard" ? r?.connected_by ?? null : null,
    connectedAt: w?.source === "dashboard" ? r?.connected_at ?? null : null,
    lastTestAt: r?.last_test_at ?? null,
    lastTestOk: r?.last_test_ok ?? null,
    lastTestDetail: r?.last_test_detail ?? null,
    lastTestSession: r?.last_test_session ?? null,
    needsReconnect: Boolean(r) && !w,
    canSave: key() !== null,
  };
}

/** Saves (or replaces) the dashboard connection. Returns an error message, or null when saved. */
export async function saveWriter(db: Db, url: string, token: string, by: string): Promise<string | null> {
  if (!FIRE_URL_RE.test(url)) {
    return "The URL must be the routine's API trigger URL: https://api.anthropic.com/v1/claude_code/routines/.../fire";
  }
  if (!TOKEN_OK.test(token)) return "The token doesn't look right. Copy it again from the routine's API trigger.";
  const box = encrypt(token);
  if (!box) return "The server has no encryption key yet. Set SECRETS_KEY (or CRON_SECRET) on the host first.";
  await db.query(
    `INSERT INTO writer_connection (id, fire_url, token_enc, token_hint, connected_by, connected_at)
     VALUES (1, $1, $2, $3, $4, now())
     ON CONFLICT (id) DO UPDATE SET fire_url = $1, token_enc = $2, token_hint = $3, connected_by = $4,
       connected_at = now(), last_test_at = NULL, last_test_ok = NULL, last_test_detail = NULL, last_test_session = NULL`,
    [url, box, token.slice(-4), by.slice(0, 200)]
  );
  return null;
}

export async function clearWriter(db: Db): Promise<void> {
  await db.query(`DELETE FROM writer_connection WHERE id = 1`);
}

export async function recordTest(db: Db, ok: boolean, detail: string, session: string | null): Promise<void> {
  await db.query(
    `UPDATE writer_connection SET last_test_at = now(), last_test_ok = $1, last_test_detail = $2, last_test_session = $3
     WHERE id = 1`,
    [ok, detail.slice(0, 300), session]
  );
}

/**
 * Fires the routine with a text payload. Used for real jobs (lib/server/jobs.ts) and for the
 * dashboard's connection test. Returns the claude.ai session link when Anthropic sends one.
 */
export async function fireRoutine(
  writer: Writer,
  text: string
): Promise<{ ok: true; sessionUrl: string | null } | { ok: false; error: string }> {
  try {
    const res = await fetch(writer.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${writer.token}`,
        "anthropic-beta": "experimental-cc-routine-2026-04-01",
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return { ok: false, error: `Routine trigger returned HTTP ${res.status} ${detail}`.trim() };
    }
    const data = (await res.json().catch(() => ({}))) as { claude_code_session_url?: unknown };
    const sessionUrl =
      typeof data.claude_code_session_url === "string" && data.claude_code_session_url.startsWith("https://claude.ai/")
        ? data.claude_code_session_url
        : null;
    return { ok: true, sessionUrl };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
