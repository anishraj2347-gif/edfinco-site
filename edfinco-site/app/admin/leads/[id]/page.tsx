import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import AdminBar from "@/components/AdminBar";
import { requireStaff } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { getLead, LEAD_STATUS_LABEL, LEAD_STATUSES, notesOf, telHref, whatsappNumber } from "@/lib/server/leads";
import { formatIst, relative } from "@/lib/server/schedule";
import { assignableStaff, nameOf, people } from "@/lib/server/staff";
import styles from "../../admin.module.css";

const MESSAGES: Record<string, string> = {
  status: "Status updated.",
  assigned: "Assigned to you.",
  "assigned-to": "Assigned. They've been emailed the details.",
  unassigned: "Unassigned.",
  note: "Note added.",
};

export default async function LeadPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const staff = await requireStaff();
  const { id } = await params;
  const db = await getDb();
  const lead = await getLead(db, id);
  if (!lead) notFound();
  const notes = await notesOf(db, lead.id);
  const team = await assignableStaff(db);
  const ppl = await people(db);
  const assignee = lead.assigned_to ? ppl.get(lead.assigned_to) : undefined;
  const q = await searchParams;
  const msg = typeof q.msg === "string" ? MESSAGES[q.msg] : undefined;
  const error = typeof q.error === "string" ? q.error.slice(0, 200) : undefined;
  const now = new Date();
  const wa = whatsappNumber(lead.phone);
  const action = `/api/admin/leads/${lead.id}`;

  return (
    <>
      <AdminBar staff={staff} current="leads" />
      <main id="main" className={`container ${styles.main}`}>
        <p className={styles.small}>
          <Link href="/admin/leads">← All consultation requests</Link>
        </p>
        <div className={styles.spread}>
          <h1 className={styles.pageTitle}>{lead.student_name}</h1>
          <span className={`${styles.badge} ${styles[`lead_${lead.status}`] ?? ""}`}>{LEAD_STATUS_LABEL[lead.status]}</span>
        </div>
        <p className={styles.lede}>
          {lead.ref} · received {formatIst(lead.created_at)} ({relative(lead.created_at, now)})
          {lead.first_contacted_at && ` · first contacted ${formatIst(lead.first_contacted_at)}`}
        </p>
        {msg && <p className={styles.flash}>{msg}</p>}
        {error && <p className={styles.flashError}>{error}</p>}
        {lead.stage === "partial" && (
          <p className={styles.flashWarn}>
            Incomplete request: they gave their contact details and agreed to be contacted, but left before telling us their study
            plans. A friendly call can help them finish.
          </p>
        )}
        {lead.stage === "started" && (
          <p className={styles.flashWarn}>They&apos;re still filling in the form (started {relative(lead.created_at, now)}).</p>
        )}
        {lead.was_partial && lead.stage === "complete" && (
          <p className={styles.flash}>They left after step 1 at first, then finished the form {lead.completed_at ? formatIst(lead.completed_at) : "later"}.</p>
        )}

        <div className={styles.layout2}>
          <div className={styles.stack}>
            <section className={styles.card} aria-labelledby="contact-title">
              <h2 id="contact-title" className={styles.cardTitle}>
                Get in touch
              </h2>
              <div className={styles.row}>
                <a href={telHref(lead.phone)} className={`btn btn-primary ${styles.btnSm}`}>
                  Call {lead.phone}
                </a>
                {wa && (
                  <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
                    WhatsApp
                  </a>
                )}
                <a
                  href={`mailto:${lead.email}?subject=${encodeURIComponent(`Your EdFinco consultation (${lead.ref})`)}`}
                  className={`btn ${styles.btnGhost} ${styles.btnSm}`}
                >
                  Email
                </a>
              </div>
              {lead.status === "new" && (
                <form action={action} method="post" style={{ marginTop: 14 }}>
                  <input type="hidden" name="action" value="contacted" />
                  <button type="submit" className={`btn btn-primary ${styles.btnSm}`}>
                    I&apos;ve contacted them: mark as Contacted
                  </button>
                </form>
              )}
            </section>

            <section className={styles.card} aria-labelledby="details-title">
              <h2 id="details-title" className={styles.cardTitle}>
                What they told us
              </h2>
              <dl className={styles.kv}>
                <dt>Email</dt>
                <dd>{lead.email}</dd>
                <dt>Phone</dt>
                <dd>{lead.phone}</dd>
                <dt>Destination</dt>
                <dd>{lead.destination || "Not given yet"}</dd>
                <dt>Study level</dt>
                <dd>{lead.study_level || "Not given yet"}</dd>
                <dt>Intake</dt>
                <dd>{lead.intake || "Not given yet"}</dd>
                <dt>Co-borrower</dt>
                <dd>{lead.co_borrower || "-"}</dd>
              </dl>
              {lead.message && (
                <>
                  <p className={styles.label} style={{ marginTop: 14 }}>
                    Message
                  </p>
                  <p className={styles.feedbackQuote}>{lead.message}</p>
                </>
              )}
              <p className={styles.small} style={{ marginTop: 14 }}>
                Consent: &ldquo;{lead.consent_text}&rdquo; ({formatIst(lead.consent_at)}).{" "}
                {lead.confirmation_sent_at ? "Confirmation email sent." : "No confirmation email was sent."}
              </p>
            </section>

            <section id="notes" className={styles.card} aria-labelledby="notes-title">
              <h2 id="notes-title" className={styles.cardTitle}>
                Notes &amp; history
              </h2>
              <form action={action} method="post" className={styles.form}>
                <input type="hidden" name="action" value="note" />
                <label htmlFor="body" className="sr-only">
                  Add a note
                </label>
                <textarea
                  id="body"
                  name="body"
                  required
                  maxLength={4000}
                  className={styles.textarea}
                  placeholder="e.g. Spoke to the student and their father. Sending the document checklist; call back Friday."
                />
                <button type="submit" className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
                  Add note
                </button>
              </form>
              <ol className={styles.timeline}>
                {notes.map((n) => (
                  <li key={n.id} className={styles[`tl_${n.kind}`] ?? ""}>
                    <div className={styles.small}>
                      <strong>{n.author}</strong> · {formatIst(n.at)}
                    </div>
                    <p className={styles.tlBody}>{n.body}</p>
                  </li>
                ))}
                <li className={styles.tl_system}>
                  <div className={styles.small}>
                    <strong>website</strong> · {formatIst(lead.created_at)}
                  </div>
                  <p className={styles.tlBody}>Request received from the consultation form.</p>
                </li>
              </ol>
            </section>
          </div>

          <aside className={`${styles.stack} ${styles.actions}`} aria-label="Manage">
            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Status</h2>
              <form action={action} method="post" className={styles.form}>
                <input type="hidden" name="action" value="status" />
                <label htmlFor="status" className="sr-only">
                  Status
                </label>
                <select id="status" name="status" defaultValue={lead.status} className={styles.input}>
                  {LEAD_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
                <button type="submit" className={`btn btn-primary ${styles.btnSm}`}>
                  Save status
                </button>
              </form>
            </section>

            <section className={styles.card}>
              <h2 className={styles.cardTitle}>Assigned to</h2>
              {lead.assigned_to ? (
                <div className={styles.stack} style={{ gap: 2, marginBottom: 12 }}>
                  <strong>{nameOf(assignee, lead.assigned_to)}</strong>
                  {assignee?.phone && (
                    <a href={telHref(assignee.phone)} className={styles.small}>
                      {assignee.phone}
                    </a>
                  )}
                  <span className={styles.small}>{lead.assigned_to}</span>
                </div>
              ) : (
                <p className={styles.muted}>Nobody yet</p>
              )}
              <form action={action} method="post" className={styles.form} style={{ marginBottom: 10 }}>
                <input type="hidden" name="action" value="assign" />
                <label htmlFor="to" className="sr-only">
                  Assign to
                </label>
                <select id="to" name="to" defaultValue={lead.assigned_to ?? ""} className={styles.input} required>
                  <option value="" disabled>
                    Choose someone
                  </option>
                  {team.map((e) => (
                    <option key={e} value={e}>
                      {nameOf(ppl.get(e), e)}
                      {ppl.get(e)?.name ? ` (${e})` : ""}
                    </option>
                  ))}
                </select>
                <button type="submit" className={`btn btn-primary ${styles.btnSm}`}>
                  Assign and email them
                </button>
              </form>
              <form action={action} method="post" className={styles.row}>
                {lead.assigned_to !== staff.email && (
                  <button type="submit" name="action" value="assign-me" className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
                    Assign to me
                  </button>
                )}
                {lead.assigned_to && (
                  <button type="submit" name="action" value="unassign" className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
                    Unassign
                  </button>
                )}
              </form>
            </section>

            {staff.role === "admin" && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Delete</h2>
                <form action={action} method="post" className={styles.form}>
                  <input type="hidden" name="action" value="delete" />
                  <label className={styles.checkLabel}>
                    <input type="checkbox" name="confirm" value="yes" required /> Permanently delete this request and its notes (for
                    example, when the student asks for their data to be erased)
                  </label>
                  <button type="submit" className={`btn ${styles.btnDanger} ${styles.btnSm}`}>
                    Delete request
                  </button>
                </form>
              </section>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
