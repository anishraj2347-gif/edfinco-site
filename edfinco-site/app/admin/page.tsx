import Link from "next/link";
import { after, connection } from "next/server";
import AdminBar from "@/components/AdminBar";
import StatusBadge from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/server/auth";
import { config, emailConfigured, sheetsConfigured, writerConfigured } from "@/lib/server/config";
import { getDb } from "@/lib/server/db";
import { recentAudit } from "@/lib/server/audit";
import { listAdminPosts, pipeline } from "@/lib/server/posts";
import { formatHHMM, formatIst, nextSlot, relative, reviewDueAt } from "@/lib/server/schedule";
import { getSettings, LEAD_MAX, LEAD_MIN } from "@/lib/server/settings";
import { leadCounts, oldestNewLead } from "@/lib/server/leads";
import { staffCounts } from "@/lib/server/staff";
import { maybeTick } from "@/lib/server/tick";
import { openTopicCount, upcomingTopics } from "@/lib/server/topics";
import styles from "./admin.module.css";

const MESSAGES: Record<string, string> = {
  "schedule-saved": "Schedule saved.",
  resumed: "Automation is on.",
  paused: "Automation paused. No new drafts will be written until you turn it back on.",
  "draft-started": "The writer has started the next draft. You'll get an approval email when it's ready.",
  "topic-added": "Topic added to the end of the list.",
  "topic-skipped": "Topic skipped.",
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const admin = await requireAdmin();
  const db = await getDb();
  const q = await searchParams;
  const settings = await getSettings(db);
  const inProgress = await pipeline(db);
  const posts = await listAdminPosts(db, 40);
  const topics = await upcomingTopics(db, 6);
  const topicsLeft = await openTopicCount(db);
  const activity = await recentAudit(db, 15);
  const leads = await leadCounts(db);
  const oldestNew = await oldestNewLead(db);
  const team = await staffCounts(db);
  after(() => maybeTick("dashboard visit"));

  const now = new Date();
  const slot = nextSlot(now, settings.publishTime);
  const emailAt = reviewDueAt(slot, settings.reviewLeadHours);
  const tickAgeMin = settings.lastTickAt ? (now.getTime() - settings.lastTickAt.getTime()) / 60000 : Infinity;
  const openWork = inProgress.some((p) => p.status !== "approved");
  const msg = typeof q.msg === "string" ? MESSAGES[q.msg] : undefined;
  // Production readiness: every external service the site relies on, without revealing any secret.
  const local = !config.isProd;
  const checks: { label: string; ok: boolean; detail: string }[] = [
    { label: "Website address", ok: config.appUrl.startsWith("https://") || local, detail: config.appUrl },
    {
      label: "Database",
      ok: Boolean(config.databaseUrl) || local,
      detail: config.databaseUrl ? "Postgres connected" : local ? "local test database (.data/pglite)" : "not connected (DATABASE_URL)",
    },
    {
      label: "Email",
      ok: emailConfigured() || local,
      detail: emailConfigured() ? `sending as ${config.emailFrom}` : local ? "saved to .data/outbox (local)" : "not connected (RESEND_API_KEY)",
    },
    {
      label: "Claude writer (Pro plan routine)",
      ok: writerConfigured() || local,
      detail: writerConfigured() ? "connected" : local ? "local test mode (scripts/dev-worker.mjs)" : "not connected (ROUTINE_FIRE_URL / TOKEN)",
    },
    {
      label: "Scheduler secret",
      ok: Boolean(config.cronSecret),
      detail: config.cronSecret ? "set" : "not set (CRON_SECRET), so the hourly check can't run",
    },
    {
      label: "Google Sheet",
      ok: sheetsConfigured() || local,
      detail: sheetsConfigured() ? "connected" : local ? "local CSV files (.data/sheets)" : "not connected (SHEETS_WEBHOOK_URL / SECRET)",
    },
  ];
  const error = typeof q.error === "string" ? q.error.slice(0, 200) : undefined;

  return (
    <>
      <AdminBar staff={admin} current="blog" />
      <main id="main" className={`container ${styles.main}`}>
        <h1 className={styles.pageTitle}>Blog automation</h1>
        <p className={styles.lede}>
          A Claude writer drafts each post, you approve it by email or here, and only approved posts go live. Times are India time.
        </p>
        {msg && <p className={styles.flash}>{msg}</p>}
        {error && <p className={styles.flashError}>{error}</p>}

        <section className={`${styles.card} ${styles.cardWide}`} aria-labelledby="leads-title">
          <div className={styles.spread}>
            <h2 id="leads-title" className={styles.cardTitle}>
              Consultation requests
            </h2>
            <Link href="/admin/leads" className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
              Open requests
            </Link>
          </div>
          <p className={styles.muted}>
            <strong>{leads.new}</strong> new · {leads.open} to do · {leads.all} total
            {oldestNew && <> · oldest new one waiting {relative(oldestNew, now).replace(" ago", "")}</>}
          </p>
        </section>

        <div className={styles.grid}>
          <section className={styles.card} aria-labelledby="auto-title">
            <div className={styles.spread}>
              <h2 id="auto-title" className={styles.cardTitle}>
                Automation
              </h2>
              <span className={styles.row}>
                <span className={settings.automationEnabled ? styles.dotOn : styles.dotOff} aria-hidden="true" />
                <strong>{settings.automationEnabled ? "On" : "Paused"}</strong>
              </span>
            </div>
            {settings.automationEnabled ? (
              <dl className={styles.kv}>
                <dt>Next post goes live</dt>
                <dd>{formatIst(slot)}</dd>
                <dt>Approval email</dt>
                <dd>
                  {formatIst(emailAt)} ({relative(emailAt, now)})
                </dd>
              </dl>
            ) : (
              <p className={styles.muted}>No new drafts are being written. Posts you already approved still go live at their time.</p>
            )}
            <form action="/api/admin/automation" method="post" className={styles.row} style={{ marginTop: 16 }}>
              <input type="hidden" name="enabled" value={settings.automationEnabled ? "0" : "1"} />
              <button type="submit" className={`btn ${settings.automationEnabled ? styles.btnDanger : "btn-primary"} ${styles.btnSm}`}>
                {settings.automationEnabled ? "Pause automation" : "Turn automation on"}
              </button>
            </form>
          </section>

          <section className={styles.card} aria-labelledby="schedule-title">
            <h2 id="schedule-title" className={styles.cardTitle}>
              Schedule
            </h2>
            <form action="/api/admin/settings" method="post" className={styles.form}>
              <div className={styles.inline}>
                <div className={styles.field}>
                  <label htmlFor="publishTime" className={styles.label}>
                    Post goes live at
                  </label>
                  <input id="publishTime" name="publishTime" type="time" required defaultValue={settings.publishTime} className={styles.input} />
                </div>
                <div className={styles.field}>
                  <label htmlFor="reviewLeadHours" className={styles.label}>
                    Send approval email (hours before)
                  </label>
                  <input
                    id="reviewLeadHours"
                    name="reviewLeadHours"
                    type="number"
                    min={LEAD_MIN}
                    max={LEAD_MAX}
                    step={1}
                    required
                    defaultValue={settings.reviewLeadHours}
                    className={styles.input}
                  />
                </div>
              </div>
              <p className={styles.small}>
                Now: live at {formatHHMM(settings.publishTime)}, email {settings.reviewLeadHours} h before. Changing the time also moves
                posts already scheduled.
              </p>
              <button type="submit" className={`btn btn-primary ${styles.btnSm}`}>
                Save schedule
              </button>
            </form>
          </section>

          <section className={styles.card} aria-labelledby="health-title">
            <h2 id="health-title" className={styles.cardTitle}>
              System check
            </h2>
            <ul className={styles.health}>
              {checks.map((c) => (
                <li key={c.label}>
                  <span className={c.ok ? styles.ok : styles.bad}>{c.ok ? "✓" : "✗"}</span>
                  <span>
                    <strong>{c.label}:</strong> {c.detail}
                  </span>
                </li>
              ))}
              <li>
                <span className={config.mainAdminEmails.length ? styles.ok : styles.bad}>{config.mainAdminEmails.length ? "✓" : "✗"}</span>
                <span>
                  <strong>Main admin:</strong> {config.mainAdminEmails.length ? "set" : "not set (MAIN_ADMIN_EMAILS)"} · team: {team.active} active
                  {team.pending > 0 && (
                    <>
                      , <Link href="/admin/team">{team.pending} waiting for approval</Link>
                    </>
                  )}
                </span>
              </li>
              <li>
                <span className={tickAgeMin < 130 ? styles.ok : styles.bad}>{tickAgeMin < 130 ? "✓" : "!"}</span>
                <span>
                  <strong>Scheduler last ran:</strong> {settings.lastTickAt ? relative(settings.lastTickAt, now) : "never"}
                  {tickAgeMin >= 130 && " (the hourly check isn't running yet)"}
                </span>
              </li>
            </ul>
          </section>
        </div>

        <section className={`${styles.card} ${styles.cardWide}`} aria-labelledby="progress-title">
          <div className={styles.spread}>
            <h2 id="progress-title" className={styles.cardTitle}>
              In progress
            </h2>
            {!openWork && (
              <form action="/api/admin/run-now" method="post">
                <button type="submit" className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
                  Write the next draft now
                </button>
              </form>
            )}
          </div>
          {inProgress.length === 0 ? (
            <p className={styles.muted}>
              Nothing in progress.{" "}
              {settings.automationEnabled ? `The next draft starts around ${formatIst(emailAt)}.` : "Turn the automation on to schedule drafts."}
            </p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Post</th>
                    <th scope="col">Status</th>
                    <th scope="col">Goes live</th>
                    <th scope="col">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inProgress.map((p) => (
                    <tr key={p.id}>
                      <td>
                        {p.title || <em>{p.topic ?? "Untitled draft"}</em>}
                        {p.version > 0 && <span className={styles.small}> · v{p.version}</span>}
                      </td>
                      <td>
                        <StatusBadge post={p} />
                      </td>
                      <td>{p.slot_at ? formatIst(p.slot_at) : p.publish_at ? formatIst(p.publish_at) : "-"}</td>
                      <td>
                        <Link href={`/admin/posts/${p.id}`}>Open</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.cardWide}`} aria-labelledby="posts-title">
          <h2 id="posts-title" className={styles.cardTitle}>
            All posts
          </h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Status</th>
                  <th scope="col">Date</th>
                  <th scope="col">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => {
                  const when = p.publish_at ?? p.slot_at ?? p.created_at;
                  return (
                    <tr key={p.id}>
                      <td>{p.title || <em>{p.topic ?? "Untitled draft"}</em>}</td>
                      <td>
                        <StatusBadge post={p} />
                      </td>
                      <td>{formatIst(when)}</td>
                      <td>
                        <Link href={`/admin/posts/${p.id}`}>Open</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <div className={styles.grid}>
          <section id="topics" className={styles.card} aria-labelledby="topics-title">
            <h2 id="topics-title" className={styles.cardTitle}>
              Next topics ({topicsLeft} left)
            </h2>
            {topics.length ? (
              <ol className={styles.list}>
                {topics.map((t) => (
                  <li key={t.id}>
                    <div className={styles.spread}>
                      <span>{t.title}</span>
                      <form action="/api/admin/topics" method="post">
                        <input type="hidden" name="action" value="skip" />
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className={styles.small} style={{ background: "none", border: 0, cursor: "pointer", textDecoration: "underline" }}>
                          Skip
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.muted}>The list is empty. The writer will suggest new topics with the next draft.</p>
            )}
            <form action="/api/admin/topics" method="post" className={styles.form} style={{ marginTop: 16 }}>
              <input type="hidden" name="action" value="add" />
              <div className={styles.field}>
                <label htmlFor="topic" className={styles.label}>
                  Add a topic
                </label>
                <input id="topic" name="title" type="text" minLength={8} maxLength={300} required className={styles.input} placeholder="e.g. Budgeting for your first month in Canada" />
              </div>
              <button type="submit" className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
                Add topic
              </button>
            </form>
          </section>

          <section className={styles.card} aria-labelledby="activity-title">
            <h2 id="activity-title" className={styles.cardTitle}>
              Recent activity
            </h2>
            {activity.length ? (
              <ul className={styles.list}>
                {activity.map((a) => (
                  <li key={a.id} className={styles.small}>
                    <strong>{a.action.replace(/_/g, " ")}</strong> by {a.actor} · {relative(a.at, now)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.muted}>No activity yet.</p>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
