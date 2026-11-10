// Email templates for the approval workflow. Every dynamic value is HTML-escaped; post Markdown
// is rendered from the parsed block list (never raw HTML). Links in approval emails open a page —
// nothing is ever approved by merely loading a URL (mail scanners pre-fetch links).
import { config } from "./config";
import { inlineRegex, parseBlocks, safeHref, type Block } from "@/lib/markdown";
import { formatIst, formatIstTime } from "./schedule";
import type { PostRow } from "./posts";
import type { Checks } from "./post-checks";

export interface Rendered {
  subject: string;
  html: string;
  text: string;
}

export const C = {
  forest: "#0c2b1e",
  emerald: "#0f766e",
  ink: "#14211c",
  muted: "#475569",
  line: "#e2e8f0",
  cream: "#fbf8f0",
  goldBg: "#fef6e7",
  redBg: "#fdecec",
};
export const FONT = "Lexend, 'Segoe UI', Arial, sans-serif";

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineHtml(text: string): string {
  let out = "";
  let last = 0;
  const re = inlineRegex();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out += esc(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out += `<strong>${esc(m[1])}</strong>`;
    } else {
      const link = safeHref(m[3]);
      if (link) {
        const href = link.external ? link.href : `${config.appUrl}${link.href}`;
        out += `<a href="${esc(href)}" style="color:${C.emerald}">${esc(m[2])}</a>`;
      } else out += esc(m[2]);
    }
    last = re.lastIndex;
  }
  return out + esc(text.slice(last));
}

function blocksHtml(blocks: Block[]): string {
  const p = `margin:0 0 14px;font-size:16px;line-height:1.65;color:${C.ink}`;
  return blocks
    .map((b) => {
      switch (b.type) {
        case "h2":
          return `<h2 style="margin:26px 0 10px;font-size:21px;line-height:1.3;color:${C.forest}">${inlineHtml(b.text)}</h2>`;
        case "h3":
          return `<h3 style="margin:20px 0 8px;font-size:18px;line-height:1.35;color:${C.forest}">${inlineHtml(b.text)}</h3>`;
        case "quote":
          return `<blockquote style="margin:16px 0;padding:10px 14px;border-left:4px solid ${C.emerald};background:${C.cream};${p}">${inlineHtml(b.text)}</blockquote>`;
        case "ul":
        case "ol":
          return `<${b.type} style="margin:0 0 14px;padding-left:22px">${b.items
            .map((it) => `<li style="${p};margin-bottom:6px">${inlineHtml(it)}</li>`)
            .join("")}</${b.type}>`;
        default:
          return `<p style="${p}">${inlineHtml(b.text)}</p>`;
      }
    })
    .join("\n");
}

export function button(href: string, label: string, primary = true): string {
  const style = primary
    ? `background:${C.emerald};color:#ffffff;border:2px solid ${C.emerald}`
    : `background:#ffffff;color:${C.emerald};border:2px solid ${C.emerald}`;
  return `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 10px 0;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;${style}">${esc(label)}</a>`;
}

export interface LayoutOptions {
  header?: string;
  footerHtml?: string;
}

const ADMIN_FOOTER = (): string =>
  `You're receiving this because your email is set as an EdFinco blog admin.
<a href="${esc(`${config.appUrl}/admin`)}" style="color:${C.emerald}">Open the admin dashboard</a> to pause the automation or change the posting time.`;

export function layout(preheader: string, inner: string, opts: LayoutOptions = {}): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EdFinco</title></head>
<body style="margin:0;padding:0;background:${C.cream};font-family:${FONT};color:${C.ink}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border:1px solid ${C.line};border-radius:16px;overflow:hidden">
<tr><td style="background:${C.forest};padding:16px 24px;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:.2px">${esc(opts.header ?? "EdFinco · Blog automation")}</td></tr>
<tr><td style="padding:24px">${inner}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${C.line};font-size:12px;line-height:1.5;color:${C.muted}">
${opts.footerHtml ?? ADMIN_FOOTER()}
</td></tr></table></td></tr></table></body></html>`;
}

function checksHtml(checks: Checks | null): string {
  if (!checks || (!checks.warnings.length && !checks.errors.length)) {
    return `<p style="margin:0 0 18px;padding:10px 14px;border-radius:10px;background:#e6f2ef;font-size:14px;color:${C.ink}">Automatic compliance checks: passed, with nothing flagged. ${checks ? `(${checks.wordCount} words)` : ""}</p>`;
  }
  const items = [...checks.errors, ...checks.warnings].map((w) => `<li style="margin-bottom:4px">${esc(w)}</li>`).join("");
  return `<div style="margin:0 0 18px;padding:10px 14px;border-radius:10px;background:${C.goldBg};font-size:14px;line-height:1.5;color:${C.ink}">
<strong>Please double-check before approving</strong> (${checks.wordCount} words):<ul style="margin:6px 0 0;padding-left:20px">${items}</ul></div>`;
}

function articleHtml(post: PostRow): string {
  const sources = post.sources.length
    ? `<p style="margin:18px 0 6px;font-size:13px;color:${C.muted}"><strong>Sources the writer used:</strong></p><ul style="margin:0;padding-left:20px;font-size:13px;color:${C.muted}">${post.sources
        .map((s) => `<li><a href="${esc(s)}" style="color:${C.emerald}">${esc(s)}</a></li>`)
        .join("")}</ul>`
    : "";
  return `<div style="margin-top:8px;padding:20px;border:1px solid ${C.line};border-radius:12px">
<p style="margin:0 0 6px;font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:${C.emerald};font-weight:700">${esc(post.tags[0] ?? "Guide")}</p>
<h1 style="margin:0 0 8px;font-size:26px;line-height:1.25;color:${C.forest}">${esc(post.title)}</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.55;color:${C.muted}">${esc(post.description)}</p>
${blocksHtml(parseBlocks(post.body))}
${sources}
</div>`;
}

const goLive = (post: PostRow): string => (post.slot_at ? formatIst(post.slot_at) : "as soon as you approve it");

export function reviewRequestEmail(
  post: PostRow,
  reviewUrl: string,
  opts: { revision: boolean; feedback: string | null }
): Rendered {
  const subject = opts.revision
    ? `Updated draft (v${post.version}) for approval: ${post.title}`
    : `For approval, goes live ${goLive(post)}: ${post.title}`;
  const intro = opts.revision
    ? `Here's the revised draft (version ${post.version}), updated with your changes.`
    : "A new blog post is ready for your approval.";
  const asked = opts.revision && opts.feedback
    ? `<p style="margin:0 0 14px;padding:10px 14px;border-left:4px solid ${C.emerald};background:${C.cream};font-size:14px;line-height:1.5"><strong>You asked:</strong> ${esc(opts.feedback)}</p>`
    : "";
  const html = layout(
    `${intro} Goes live ${goLive(post)} if approved.`,
    `<p style="margin:0 0 10px;font-size:16px;line-height:1.6">${esc(intro)}</p>
${asked}
<p style="margin:0 0 16px;font-size:15px;line-height:1.6">It goes live on the website <strong>${esc(goLive(post))}</strong>, but only if you approve it. If it isn't approved in time, nothing is published and it moves to the next day.</p>
<div>${button(`${reviewUrl}#approve`, "Approve")}${button(`${reviewUrl}#changes`, "Request changes", false)}</div>
<p style="margin:2px 0 18px;font-size:13px;line-height:1.5;color:${C.muted}">Each button opens a secure page for this draft where you confirm with one more click. The link works for this version only.</p>
${checksHtml(post.checks)}
${articleHtml(post)}`
  );
  const text = `${intro}
${opts.revision && opts.feedback ? `\nYou asked: ${opts.feedback}\n` : ""}
Goes live ${goLive(post)} if approved. If it isn't approved in time, nothing is published and it moves to the next day.

Approve or request changes: ${reviewUrl}

${post.checks?.warnings.length ? `Please double-check:\n- ${post.checks.warnings.join("\n- ")}\n\n` : ""}---
${post.title}
${post.description}

${post.body}
`;
  return { subject, html, text };
}

export function reminderEmail(post: PostRow, reviewUrl: string): Rendered {
  const when = post.slot_at ? formatIstTime(post.slot_at) : "its posting time";
  const subject = `Reminder: "${post.title}" goes live at ${when} only if you approve it`;
  const html = layout(
    `Still waiting for your approval: ${post.title}`,
    `<p style="margin:0 0 12px;font-size:16px;line-height:1.6">Today's post is still waiting for your approval. It goes live at <strong>${esc(when)}</strong> only if you approve it.</p>
<div>${button(`${reviewUrl}#approve`, "Approve")}${button(`${reviewUrl}#changes`, "Request changes", false)}</div>
${articleHtml(post)}`
  );
  return { subject, html, text: `Still waiting for your approval: ${post.title}\nGoes live at ${when} only if approved.\n\n${reviewUrl}\n` };
}

export function missedSlotEmail(post: PostRow, newSlot: Date, reviewUrl: string | null): Rendered {
  const subject = `Not published: "${post.title || post.topic || "today's post"}" moved to ${formatIst(newSlot)}`;
  const html = layout(
    "This post wasn't approved in time, so nothing was published.",
    `<p style="margin:0 0 12px;font-size:16px;line-height:1.6">This post wasn't approved in time, so <strong>nothing was published</strong>. It has moved to the next slot: <strong>${esc(formatIst(newSlot))}</strong>. No extra drafts are written while it waits.</p>
${reviewUrl ? `<div>${button(`${reviewUrl}#approve`, "Approve")}${button(`${reviewUrl}#changes`, "Request changes", false)}</div>` : `<div>${button(`${config.appUrl}/admin`, "Open the dashboard")}</div>`}`
  );
  return { subject, html, text: `Not published: ${post.title}\nMoved to ${formatIst(newSlot)}.\n${reviewUrl ?? `${config.appUrl}/admin`}\n` };
}

export function publishedEmail(post: PostRow): Rendered {
  const url = `${config.appUrl}/blog/${post.slug}`;
  const subject = `Published: ${post.title}`;
  const html = layout(
    `Now live: ${post.title}`,
    `<p style="margin:0 0 14px;font-size:16px;line-height:1.6">Your approved post is now live on the website.</p>
<p style="margin:0 0 16px;font-size:18px;font-weight:700;color:${C.forest}">${esc(post.title)}</p>
<div>${button(url, "View the post")}${button(`${config.appUrl}/admin`, "Dashboard", false)}</div>`
  );
  return { subject, html, text: `Now live: ${post.title}\n${url}\n` };
}

export function writerProblemEmail(post: PostRow, detail: string): Rendered {
  const name = post.title || post.topic || "the next post";
  const subject = `Blog writer problem: ${name}`;
  const html = layout(
    "The writer couldn't finish a draft.",
    `<p style="margin:0 0 12px;font-size:16px;line-height:1.6">The Claude writer couldn't finish <strong>${esc(name)}</strong>.</p>
<p style="margin:0 0 16px;padding:10px 14px;border-radius:10px;background:${C.redBg};font-size:14px;line-height:1.5">${esc(detail)}</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.6">Open the dashboard to retry, or reject it so a different post is written. If this keeps happening, check the routine at claude.ai/code/routines.</p>
<div>${button(`${config.appUrl}/admin/posts/${post.id}`, "Open in the dashboard")}</div>`
  );
  return { subject, html, text: `The writer couldn't finish ${name}: ${detail}\n${config.appUrl}/admin/posts/${post.id}\n` };
}

export function loginLinkEmail(url: string): Rendered {
  const subject = "Your EdFinco dashboard sign-in link";
  const html = layout(
    "Sign in to the EdFinco dashboard.",
    `<p style="margin:0 0 14px;font-size:16px;line-height:1.6">Use this link to sign in to the EdFinco dashboard. It works once and expires in 15 minutes.</p>
<div>${button(url, "Sign in")}</div>
<p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:${C.muted}">If you didn't ask for this, you can ignore this email. Nobody can sign in without the link.</p>`
  );
  return { subject, html, text: `Sign in to the EdFinco dashboard (works once, expires in 15 minutes):\n${url}\n` };
}
