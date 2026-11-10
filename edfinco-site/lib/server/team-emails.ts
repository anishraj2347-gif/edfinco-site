// Emails for consultation requests and dashboard access. Every value is HTML-escaped; the
// student's own text is shown only to the team, never echoed back in the student's confirmation.
import { config } from "./config";
import { SITE } from "@/lib/content";
import { button, C, esc, layout, type Rendered } from "./email-templates";
import { formatIst } from "./schedule";
import { ROLE_LABEL, type Person, type Role } from "./staff";
import { telHref, whatsappNumber, type LeadRow } from "./leads";

const TEAM_FOOTER = (): string =>
  `You're receiving this because you have access to the EdFinco dashboard. These are personal details shared for this enquiry only: please don't forward them outside the team. <a href="${esc(`${config.appUrl}/admin/leads`)}" style="color:${C.emerald}">All consultation requests</a>`;

const personLine = (p: Person): string => [p.name || p.email, p.phone, p.name ? p.email : ""].filter(Boolean).join(" · ");

function row(label: string, value: string, html?: string): string {
  return `<tr><td style="padding:7px 10px 7px 0;color:${C.muted};font-size:14px;vertical-align:top;white-space:nowrap">${esc(label)}</td><td style="padding:7px 0;font-size:15px;color:${C.ink};vertical-align:top">${html ?? esc(value || "-")}</td></tr>`;
}

function leadTable(lead: LeadRow, assignee?: Person | null): string {
  const phone = `<a href="${esc(telHref(lead.phone))}" style="color:${C.emerald};font-weight:600">${esc(lead.phone)}</a>`;
  const email = `<a href="mailto:${esc(lead.email)}" style="color:${C.emerald}">${esc(lead.email)}</a>`;
  const message = lead.message ? `<span style="white-space:pre-wrap">${esc(lead.message)}</span>` : undefined;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:6px 0 18px;border-collapse:collapse">
${row("Student", lead.student_name)}
${row("Phone", lead.phone, phone)}
${row("Email", lead.email, email)}
${row("Destination", lead.destination || "Not given yet")}
${row("Study level", lead.study_level || "Not given yet")}
${row("Intake", lead.intake || "Not given yet")}
${row("Co-borrower", lead.co_borrower)}
${row("Message", lead.message, message)}
${row("Received", formatIst(lead.created_at))}
${row("Reference", lead.ref)}
${assignee ? row("Assigned to", personLine(assignee)) : ""}
${row("Consent", `${lead.consent_text} (${formatIst(lead.consent_at)})`)}
</table>`;
}

function contactButtons(lead: LeadRow): string {
  const wa = whatsappNumber(lead.phone);
  return [
    button(telHref(lead.phone), "Call now"),
    wa ? button(`https://wa.me/${wa}`, "WhatsApp", false) : "",
    button(`mailto:${lead.email}?subject=${encodeURIComponent(`Your EdFinco consultation (${lead.ref})`)}`, "Email", false),
    button(`${config.appUrl}/admin/leads/${lead.id}`, "Open in dashboard", false),
  ].join("");
}

function textVersion(lead: LeadRow, assignee?: Person | null): string {
  return `Student: ${lead.student_name}
Phone: ${lead.phone}
Email: ${lead.email}
Destination: ${lead.destination || "Not given yet"}
Study level: ${lead.study_level || "Not given yet"}
Intake: ${lead.intake || "Not given yet"}
Co-borrower: ${lead.co_borrower || "-"}
Message: ${lead.message || "-"}
Received: ${formatIst(lead.created_at)}
Reference: ${lead.ref}
${assignee ? `Assigned to: ${personLine(assignee)}\n` : ""}
Open: ${config.appUrl}/admin/leads/${lead.id}
`;
}

/** Who an alert is for: the assigned team member, or the admins when nobody could be assigned. */
export interface AlertContext {
  assignee: Person | null;
}

function routingNote(ctx: AlertContext): string {
  if (ctx.assignee) {
    return `<p style="margin:0 0 12px;padding:10px 14px;border-radius:10px;background:#e6f2ef;font-size:15px;line-height:1.5"><strong>Assigned to you${ctx.assignee.name ? `, ${esc(ctx.assignee.name)}` : ""}.</strong> Please get in touch as soon as you can, then mark it as <strong>Contacted</strong> in the dashboard.</p>`;
  }
  return `<p style="margin:0 0 12px;padding:10px 14px;border-radius:10px;background:${C.goldBg};font-size:15px;line-height:1.5"><strong>Not assigned yet.</strong> Nobody in the team has "Gets new requests" switched on, so this came to the admins. Assign it to someone in the dashboard.</p>`;
}

/** The moment a request arrives (or a partial one is finished). Reply-To is the student. */
export function newLeadEmail(lead: LeadRow, ctx: AlertContext): Rendered {
  const kind = lead.was_partial ? "Completed consultation request" : "New consultation request";
  const forYou = ctx.assignee ? " (assigned to you)" : "";
  const subject = `${kind}${forYou}: ${lead.student_name} · ${lead.destination} · ${lead.study_level} (${lead.ref})`;
  const html = layout(
    `${kind} from ${lead.student_name}. Please get in touch as soon as you can.`,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:${C.forest}">${esc(kind)}</p>
${routingNote(ctx)}
<div>${contactButtons(lead)}</div>
${leadTable(lead, ctx.assignee)}
<p style="margin:0;font-size:13px;color:${C.muted}">Replying to this email writes to the student.</p>`,
    { header: "EdFinco · Consultation requests", footerHtml: TEAM_FOOTER() }
  );
  return { subject, html, text: `${kind}${forYou}. Please get in touch as soon as you can.\n\n${textVersion(lead, ctx.assignee)}` };
}

/** A student gave contact details + consent (step 1) but left before step 2. */
export function partialLeadEmail(lead: LeadRow, ctx: AlertContext): Rendered {
  const forYou = ctx.assignee ? " (assigned to you)" : "";
  const subject = `Incomplete consultation request${forYou}: ${lead.student_name} (${lead.ref}) left after step 1`;
  const html = layout(
    `${lead.student_name} started a consultation request but didn't finish it.`,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:${C.forest}">Incomplete consultation request</p>
${routingNote(ctx)}
<p style="margin:0 0 12px;font-size:15px;line-height:1.6"><strong>${esc(lead.student_name)}</strong> gave their contact details and agreed to be contacted, but left before telling us their study plans. A friendly call can help them finish.</p>
<div>${contactButtons(lead)}</div>
${leadTable(lead, ctx.assignee)}
<p style="margin:0;font-size:13px;color:${C.muted}">If they finish the form later, you'll get a "Completed consultation request" email.</p>`,
    { header: "EdFinco · Consultation requests", footerHtml: TEAM_FOOTER() }
  );
  return { subject, html, text: `Incomplete consultation request${forYou} (left after step 1).\n\n${textVersion(lead, ctx.assignee)}` };
}

/** Someone assigned (or reassigned) a request to a team member. */
export function assignedLeadEmail(lead: LeadRow, assignee: Person, byName: string): Rendered {
  const subject = `Assigned to you: ${lead.student_name} (${lead.ref})`;
  const html = layout(
    `${byName} assigned you a consultation request from ${lead.student_name}.`,
    `<p style="margin:0 0 6px;font-size:18px;font-weight:700;color:${C.forest}">A consultation request for you</p>
<p style="margin:0 0 12px;font-size:15px;line-height:1.6"><strong>${esc(byName)}</strong> assigned you this request${assignee.name ? `, ${esc(assignee.name)}` : ""}. Please get in touch as soon as you can.</p>
<div>${contactButtons(lead)}</div>
${leadTable(lead, assignee)}`,
    { header: "EdFinco · Consultation requests", footerHtml: TEAM_FOOTER() }
  );
  return { subject, html, text: `${byName} assigned you a consultation request.\n\n${textVersion(lead, assignee)}` };
}

/** Once, if a request is still "New" after 2 hours: to the assignee and the main admin(s). */
export function leadNudgeEmail(lead: LeadRow, assignee: Person | null): Rendered {
  const subject = `Not contacted yet: ${lead.student_name} (${lead.ref}), waiting since ${formatIst(lead.created_at)}`;
  const who = assignee
    ? `It's assigned to <strong>${esc(personLine(assignee))}</strong>. If they can't take it, reassign it in the dashboard.`
    : "It isn't assigned to anyone yet.";
  const html = layout(
    `${lead.student_name} is still waiting for a call.`,
    `<p style="margin:0 0 12px;font-size:16px;line-height:1.6"><strong>${esc(lead.student_name)}</strong> asked for a consultation at ${esc(formatIst(lead.created_at))} and is still marked <strong>New</strong>. ${who}</p>
<div>${contactButtons(lead)}</div>
${leadTable(lead, assignee)}`,
    { header: "EdFinco · Consultation requests", footerHtml: TEAM_FOOTER() }
  );
  return { subject, html, text: `Still not contacted.\n\n${textVersion(lead, assignee)}` };
}

/**
 * To the student: a confirmation with their reference. Deliberately echoes nothing they typed
 * (only the fixed options they picked), so the form can't be used to send arbitrary text to others.
 */
export function leadConfirmationEmail(lead: LeadRow): Rendered {
  const subject = `We've received your consultation request (${lead.ref})`;
  const html = layout(
    "Thanks for contacting EdFinco. An advisor will be in touch to set up your free consultation.",
    `<p style="margin:0 0 12px;font-size:16px;line-height:1.6">Hello,</p>
<p style="margin:0 0 12px;font-size:16px;line-height:1.6">Thank you for contacting EdFinco. We've received your request for a free consultation about studying in <strong>${esc(lead.destination)}</strong> (${esc(lead.study_level)}), and an advisor will be in touch to set up a time.</p>
<p style="margin:0 0 12px;font-size:16px;line-height:1.6">Your reference is <strong>${esc(lead.ref)}</strong>. To add anything, just reply to this email.</p>
<p style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${C.muted}">EdFinco is a loan-assistance platform, not a lender. Loan approval, amount, interest rate and terms are decided solely by the lender.</p>`,
    {
      header: "EdFinco",
      footerHtml: `You're receiving this because this email address was used to request a consultation on ${esc(SITE.url.replace(/^https?:\/\//, ""))}. If that wasn't you, you can ignore this email.`,
    }
  );
  return {
    subject,
    html,
    text: `Hello,\n\nThank you for contacting EdFinco. We've received your request for a free consultation about studying in ${lead.destination} (${lead.study_level}), and an advisor will be in touch to set up a time.\n\nYour reference is ${lead.ref}. To add anything, just reply to this email.\n\nEdFinco is a loan-assistance platform, not a lender. Loan approval, amount, interest rate and terms are decided solely by the lender.\n`,
  };
}

/** To the main admin(s): someone asked to give a person dashboard access. */
export function accessRequestEmail(person: Person, role: Role, by: string, note: string | null): Rendered {
  const subject = `Approval needed: dashboard access for ${person.name || person.email}`;
  const html = layout(
    `${by} wants to give ${person.email} access to the EdFinco dashboard.`,
    `<p style="margin:0 0 12px;font-size:16px;line-height:1.6"><strong>${esc(by)}</strong> wants to give this person access to the EdFinco dashboard as <strong>${esc(ROLE_LABEL[role])}</strong>:</p>
<p style="margin:0 0 12px;font-size:16px;line-height:1.6"><strong>${esc(person.name || "-")}</strong><br>${esc(person.email)}<br>${esc(person.phone || "-")}</p>
${note ? `<p style="margin:0 0 12px;padding:10px 14px;border-left:4px solid ${C.emerald};background:${C.cream};font-size:14px">${esc(note)}</p>` : ""}
<p style="margin:0 0 14px;font-size:15px;line-height:1.6">They can't sign in until you approve. Only a main admin can approve or reject.</p>
<div>${button(`${config.appUrl}/admin/team`, "Review in the dashboard")}</div>`,
    { header: "EdFinco · Team & access" }
  );
  return {
    subject,
    html,
    text: `${by} wants to give ${person.name || person.email} (${person.email}, ${person.phone || "-"}) access as ${ROLE_LABEL[role]}.\nReview: ${config.appUrl}/admin/team\n`,
  };
}

/** To the new member once they have access. */
export function accessGrantedEmail(email: string, role: Role): Rendered {
  const subject = "You now have access to the EdFinco dashboard";
  const html = layout(
    "You've been given access to the EdFinco dashboard.",
    `<p style="margin:0 0 12px;font-size:16px;line-height:1.6">You've been given access to the EdFinco dashboard as <strong>${esc(ROLE_LABEL[role])}</strong>.</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6">To sign in, enter this email address (${esc(email)}) and we'll send you a one-time link. No password needed.</p>
<div>${button(`${config.appUrl}/admin/login`, "Sign in")}</div>`,
    { header: "EdFinco · Team & access", footerHtml: "You're receiving this because an EdFinco admin gave this address dashboard access." }
  );
  return { subject, html, text: `You now have access to the EdFinco dashboard as ${ROLE_LABEL[role]}.\nSign in: ${config.appUrl}/admin/login\n` };
}
