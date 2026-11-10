// Outgoing email. Production: Resend's HTTP API (free tier: 3,000 emails/month) with the key held
// server-side only. Local development (no RESEND_API_KEY): every email is saved as an .html file in
// .data/outbox/ so the whole approval flow can be tested without sending anything.
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

export interface Email {
  to: string[];
  subject: string;
  html: string;
  text: string;
  /** Where replies go (e.g. the student, so the team can reply straight from the alert). */
  replyTo?: string;
}

export async function sendEmail(email: Email): Promise<{ ok: boolean; error?: string }> {
  if (!email.to.length) return { ok: false, error: "No recipients (set ADMIN_EMAILS)." };

  if (config.resendApiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${config.resendApiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: config.emailFrom,
          to: email.to,
          subject: email.subject.replace(/[\r\n]+/g, " "),
          html: email.html,
          text: email.text,
          ...(email.replyTo ? { reply_to: email.replyTo } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 300);
        console.error("[email] Resend error", res.status, detail);
        return { ok: false, error: `Email provider returned HTTP ${res.status}.` };
      }
      return { ok: true };
    } catch (err) {
      console.error("[email] send failed", err);
      return { ok: false, error: "Email provider unreachable." };
    }
  }

  if (!config.isProd || config.allowLocalDb) {
    const dir = path.join(process.cwd(), ".data", "outbox");
    fs.mkdirSync(dir, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, "-")}-${email.subject
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 50)}`;
    fs.writeFileSync(path.join(dir, `${name}.html`), email.html);
    fs.writeFileSync(path.join(dir, `${name}.txt`), `To: ${email.to.join(", ")}\n${email.replyTo ? `Reply-To: ${email.replyTo}\n` : ""}Subject: ${email.subject}\n\n${email.text}`);
    console.info(`[email:dev] "${email.subject}" → ${email.to.join(", ")} (saved to .data/outbox/${name}.html)`);
    return { ok: true };
  }

  console.error("[email] RESEND_API_KEY is not set; email not sent:", email.subject);
  return { ok: false, error: "Email not configured." };
}

