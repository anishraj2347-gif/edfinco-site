// Sends an email to a group (looked up fresh each time, so access changes apply immediately).
// Consultation requests are routed to ONE assigned person — see lib/server/lead-workflow.ts.
import { getDb } from "./db";
import { config } from "./config";
import { sendEmail, type Email } from "./email";
import { adminRecipients } from "./staff";

type Message = Omit<Email, "to">;

/** Blog approval emails and system alerts. */
export async function sendToAdmins(message: Message): Promise<{ ok: boolean; error?: string }> {
  return sendEmail({ ...message, to: await adminRecipients(await getDb()) });
}

/** Access requests that need a decision. */
export function sendToMainAdmins(message: Message): Promise<{ ok: boolean; error?: string }> {
  return sendEmail({ ...message, to: [...config.mainAdminEmails] });
}
