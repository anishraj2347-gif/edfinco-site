import Link from "next/link";
import { connection } from "next/server";
import AdminBar from "@/components/AdminBar";
import { requireAdmin } from "@/lib/server/auth";
import { config } from "@/lib/server/config";
import { getDb } from "@/lib/server/db";
import { telHref } from "@/lib/server/leads";
import { formatIst, relative } from "@/lib/server/schedule";
import { listStaff, nameOf, people, ROLE_LABEL, rotationMembers, type Person } from "@/lib/server/staff";
import styles from "../admin.module.css";

const MESSAGES: Record<string, string> = {
  requested: "Added. They can't sign in until a main admin approves; the main admin has been emailed.",
  added: "Added and active. They've been emailed how to sign in.",
  approved: "Approved. They've been emailed how to sign in.",
  rejected: "Request rejected.",
  removed: "Access removed. They've been signed out everywhere.",
  "role-changed": "Role changed.",
  "rotation-on": "They'll now get new consultation requests in turn.",
  "rotation-off": "They won't get new consultation requests until you switch this back on.",
  details: "Details saved.",
};

function Contact({ p }: { p: Person | undefined }) {
  if (!p?.phone) return <span className={styles.small}>-</span>;
  return <a href={telHref(p.phone)}>{p.phone}</a>;
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const admin = await requireAdmin();
  const db = await getDb();
  const rows = await listStaff(db);
  const ppl = await people(db);
  const rotation = await rotationMembers(db);
  const q = await searchParams;
  const msg = typeof q.msg === "string" ? MESSAGES[q.msg] : undefined;
  const error = typeof q.error === "string" ? q.error.slice(0, 200) : undefined;
  const pending = rows.filter((r) => r.status === "pending");
  const active = rows.filter((r) => r.status === "active");
  const past = rows.filter((r) => r.status === "rejected" || r.status === "removed").slice(0, 10);
  const now = new Date();

  return (
    <>
      <AdminBar staff={admin} current="team" />
      <main id="main" className={`container ${styles.main}`}>
        <h1 className={styles.pageTitle}>Team &amp; access</h1>
        <p className={styles.lede}>
          Only the people listed here can get a sign-in link. Anyone an admin adds stays <strong>pending</strong> until a main admin
          approves them.
        </p>
        {msg && <p className={styles.flash}>{msg}</p>}
        {error && <p className={styles.flashError}>{error}</p>}

        <section className={`${styles.card} ${styles.cardWide}`} aria-labelledby="rotation-title">
          <h2 id="rotation-title" className={styles.cardTitle}>
            Who gets new consultation requests
          </h2>
          {rotation.length ? (
            <p className={styles.muted}>
              Each new request is assigned to one person in turn, and only they get the email. Next up:{" "}
              <strong>{rotation.map((e) => nameOf(ppl.get(e), e)).join(" → ")}</strong>. Switch someone off below while they&apos;re
              away.
            </p>
          ) : (
            <p className={styles.flashWarn} style={{ margin: 0 }}>
              Nobody has &ldquo;Gets new requests&rdquo; switched on, so new requests go to the admins unassigned. Add a team member or
              switch someone on below.
            </p>
          )}
        </section>

        <div className={styles.grid}>
          <section className={styles.card} aria-labelledby="add-title">
            <h2 id="add-title" className={styles.cardTitle}>
              Add someone
            </h2>
            <form action="/api/admin/team" method="post" className={styles.form}>
              <input type="hidden" name="action" value="add" />
              <div className={styles.field}>
                <label htmlFor="name" className={styles.label}>
                  Full name
                </label>
                <input id="name" name="name" type="text" required minLength={2} maxLength={100} className={styles.input} />
              </div>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>
                  Email <span className={styles.small}>(their sign-in address)</span>
                </label>
                <input id="email" name="email" type="email" required maxLength={254} className={styles.input} />
              </div>
              <div className={styles.field}>
                <label htmlFor="phone" className={styles.label}>
                  Phone number
                </label>
                <input id="phone" name="phone" type="tel" required maxLength={20} inputMode="tel" placeholder="e.g. +91 98765 43210" className={styles.input} />
              </div>
              <fieldset className={styles.fieldset}>
                <legend className={styles.label}>Access</legend>
                <label className={styles.checkLabel}>
                  <input type="radio" name="role" value="team" defaultChecked required /> {ROLE_LABEL.team}: gets new requests in turn
                </label>
                <label className={styles.checkLabel}>
                  <input type="radio" name="role" value="admin" /> {ROLE_LABEL.admin}
                </label>
              </fieldset>
              <div className={styles.field}>
                <label htmlFor="note" className={styles.label}>
                  Why do they need access? <span className={styles.small}>(optional, shown to the main admin)</span>
                </label>
                <input id="note" name="note" type="text" maxLength={300} className={styles.input} />
              </div>
              <button type="submit" className={`btn btn-primary ${styles.btnSm}`}>
                {admin.isMain ? "Add (active straight away)" : "Request access for them"}
              </button>
            </form>
          </section>

          <section className={styles.card} aria-labelledby="main-title">
            <h2 id="main-title" className={styles.cardTitle}>
              Main admin{config.mainAdminEmails.length === 1 ? "" : "s"}
            </h2>
            <ul className={styles.list} style={{ listStyle: "none", paddingLeft: 0 }}>
              {config.mainAdminEmails.map((e) => {
                const p = ppl.get(e);
                return (
                  <li key={e}>
                    <strong>{nameOf(p, e)}</strong>
                    {e === admin.email && <span className={styles.small}> (you)</span>}
                    <div className={styles.small}>{e}</div>
                    <div className={styles.small}>
                      <Contact p={p} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className={styles.small} style={{ marginTop: 10 }}>
              Main admins have full access and are the only ones who can approve, reject or remove people. They&apos;re set in the
              server settings (MAIN_ADMIN_EMAILS), so nobody can lock them out from here. Everyone keeps their own name and phone up to
              date in <Link href="/admin/me">My details</Link>.
            </p>
          </section>
        </div>

        <section className={`${styles.card} ${styles.cardWide}`} aria-labelledby="pending-title">
          <h2 id="pending-title" className={styles.cardTitle}>
            Waiting for approval ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className={styles.muted}>Nobody is waiting.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Access</th>
                    <th scope="col">Requested by</th>
                    <th scope="col">Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((r) => (
                    <tr key={r.email}>
                      <td>
                        <strong>{nameOf(ppl.get(r.email), r.email)}</strong>
                        {r.note && <div className={styles.small}>&ldquo;{r.note}&rdquo;</div>}
                      </td>
                      <td>{r.email}</td>
                      <td>
                        <Contact p={ppl.get(r.email)} />
                      </td>
                      <td>{ROLE_LABEL[r.role]}</td>
                      <td className={styles.small}>
                        {nameOf(ppl.get(r.requested_by), r.requested_by)}
                        <div>{formatIst(r.requested_at)}</div>
                      </td>
                      <td>
                        {admin.isMain ? (
                          <form action="/api/admin/team" method="post" className={styles.row}>
                            <input type="hidden" name="email" value={r.email} />
                            <button type="submit" name="action" value="approve" className={`btn btn-primary ${styles.btnSm}`}>
                              Approve
                            </button>
                            <button type="submit" name="action" value="reject" className={`btn ${styles.btnDanger} ${styles.btnSm}`}>
                              Reject
                            </button>
                          </form>
                        ) : (
                          <span className={styles.small}>Waiting for a main admin</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.cardWide}`} aria-labelledby="active-title">
          <h2 id="active-title" className={styles.cardTitle}>
            Team members ({active.length})
          </h2>
          {active.length === 0 ? (
            <p className={styles.muted}>Nobody yet. Add your team above.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Access</th>
                    <th scope="col">Gets new requests</th>
                    {admin.isMain && <th scope="col">Manage</th>}
                  </tr>
                </thead>
                <tbody>
                  {active.map((r) => {
                    const p = ppl.get(r.email);
                    return (
                      <tr key={r.email}>
                        <td>
                          <strong>{nameOf(p, r.email)}</strong>
                          {r.decided_by && <div className={styles.small}>approved by {nameOf(ppl.get(r.decided_by), r.decided_by)}</div>}
                        </td>
                        <td>{r.email}</td>
                        <td>
                          <Contact p={p} />
                        </td>
                        <td>{ROLE_LABEL[r.role]}</td>
                        <td>
                          <form action="/api/admin/team" method="post" className={styles.row}>
                            <input type="hidden" name="email" value={r.email} />
                            <input type="hidden" name="action" value="rotation" />
                            <input type="hidden" name="on" value={r.receives_leads ? "0" : "1"} />
                            <span className={r.receives_leads ? styles.ok : styles.small}>{r.receives_leads ? "On" : "Off"}</span>
                            <button type="submit" className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
                              {r.receives_leads ? "Switch off" : "Switch on"}
                            </button>
                          </form>
                          {r.last_lead_at && <div className={styles.small}>last one {relative(r.last_lead_at, now)}</div>}
                        </td>
                        {admin.isMain && (
                          <td>
                            <form action="/api/admin/team" method="post" className={styles.row}>
                              <input type="hidden" name="email" value={r.email} />
                              <input type="hidden" name="role" value={r.role === "admin" ? "team" : "admin"} />
                              <button type="submit" name="action" value="role" className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
                                Make {r.role === "admin" ? "team" : "admin"}
                              </button>
                              <button type="submit" name="action" value="remove" className={`btn ${styles.btnDanger} ${styles.btnSm}`}>
                                Remove
                              </button>
                            </form>
                            <details style={{ marginTop: 8 }}>
                              <summary className={styles.small} style={{ cursor: "pointer" }}>
                                Edit name / phone
                              </summary>
                              <form action="/api/admin/team" method="post" className={styles.form} style={{ marginTop: 8 }}>
                                <input type="hidden" name="action" value="details" />
                                <input type="hidden" name="email" value={r.email} />
                                <label className="sr-only" htmlFor={`n-${r.email}`}>
                                  Name
                                </label>
                                <input id={`n-${r.email}`} name="name" defaultValue={p?.name} required minLength={2} maxLength={100} className={styles.input} />
                                <label className="sr-only" htmlFor={`p-${r.email}`}>
                                  Phone
                                </label>
                                <input id={`p-${r.email}`} name="phone" type="tel" defaultValue={p?.phone} required maxLength={20} className={styles.input} />
                                <button type="submit" className={`btn btn-primary ${styles.btnSm}`}>
                                  Save
                                </button>
                              </form>
                            </details>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {past.length > 0 && (
          <section className={`${styles.card} ${styles.cardWide}`} aria-labelledby="past-title">
            <h2 id="past-title" className={styles.cardTitle}>
              Removed or rejected
            </h2>
            <ul className={styles.list}>
              {past.map((r) => (
                <li key={r.email} className={styles.small}>
                  {nameOf(ppl.get(r.email), r.email)} ({r.email}): {r.status} by {r.decided_by ? nameOf(ppl.get(r.decided_by), r.decided_by) : "-"}
                  {r.decided_at ? ` on ${formatIst(r.decided_at)}` : ""}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
