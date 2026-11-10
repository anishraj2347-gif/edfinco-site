import Link from "next/link";
import { after, connection } from "next/server";
import AdminBar from "@/components/AdminBar";
import { requireStaff } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { LEAD_STAGE_LABEL, LEAD_STATUS_LABEL, LEAD_STATUSES, leadCounts, listLeads, PAGE_SIZE } from "@/lib/server/leads";
import { sheetsConfigured } from "@/lib/server/config";
import { pendingSheetChanges, sheetEnabled } from "@/lib/server/sheets";
import { nameOf, people, rotationMembers } from "@/lib/server/staff";
import { formatIst, relative } from "@/lib/server/schedule";
import { maybeTick } from "@/lib/server/tick";
import styles from "../admin.module.css";

const TABS: { key: string; label: string }[] = [
  { key: "open", label: "To do" },
  { key: "partial", label: "Incomplete" },
  ...LEAD_STATUSES.map((s) => ({ key: s, label: LEAD_STATUS_LABEL[s] })),
  { key: "all", label: "All" },
];

const MESSAGES: Record<string, string> = {
  deleted: "Request deleted (and removed from the Google Sheet).",
  "sheet-synced": "All requests copied to the Google Sheet.",
  "sheet-queued": "Copying to the Google Sheet started; anything that didn't go through is retried automatically.",
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const staff = await requireStaff();
  const q = await searchParams;
  const str = (k: string) => (typeof q[k] === "string" ? (q[k] as string) : "");
  const status = TABS.some((t) => t.key === str("status")) ? str("status") : "open";
  const search = str("q").slice(0, 100);
  const mine = str("assigned") === "me";
  const page = Math.max(1, Number(str("page")) || 1);

  const db = await getDb();
  const counts = await leadCounts(db);
  const { rows, total } = await listLeads(db, { status, q: search, assigned: mine ? staff.email : "", page });
  const sheetPending = await pendingSheetChanges(db);
  const ppl = await people(db);
  const rotation = await rotationMembers(db);
  after(() => maybeTick("leads visit"));

  const now = new Date();
  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ status, ...(search ? { q: search } : {}), ...(mine ? { assigned: "me" } : {}), ...over });
    return `?${p.toString()}`;
  };
  const exportHref = `/api/admin/leads/export${qs({}).replace(/&?page=\d+/, "")}`;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const msg = MESSAGES[str("msg")];
  const error = str("error").slice(0, 200);

  return (
    <>
      <AdminBar staff={staff} current="leads" />
      <main id="main" className={`container ${styles.main}`}>
        <div className={styles.spread}>
          <div>
            <h1 className={styles.pageTitle}>Consultation requests</h1>
            <p className={styles.lede}>
              {counts.new} new · {counts.open} to do · {counts.all} total. Mark a request <strong>Contacted</strong> as soon as you&apos;ve
              reached the student.
            </p>
          </div>
          <div className={styles.row}>
            <a href={exportHref} className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
              Export CSV
            </a>
            {staff.role === "admin" && sheetEnabled() && (
              <form action="/api/admin/leads/sync-sheet" method="post">
                <button type="submit" className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
                  Copy all to Google Sheet
                </button>
              </form>
            )}
          </div>
        </div>
        <p className={styles.small} style={{ marginTop: -12, marginBottom: 4 }}>
          New requests go to:{" "}
          {rotation.length ? (
            <>
              one person at a time, in turn ({rotation.map((e) => nameOf(ppl.get(e), e)).join(" → ")})
            </>
          ) : (
            <>the admins, unassigned (nobody has &ldquo;Gets new requests&rdquo; on{staff.role === "admin" ? <>: see <Link href="/admin/team">Team &amp; access</Link></> : ""})</>
          )}
        </p>
        <p className={styles.small} style={{ marginTop: 0, marginBottom: 16 }}>
          Google Sheet:{" "}
          {sheetsConfigured()
            ? "connected, every request is copied automatically (tabs: Submitted, Partial)"
            : sheetEnabled()
              ? "local test mode, copied to .data/sheets/Submitted.csv and Partial.csv"
              : "not connected yet (see the setup guide)"}
          {sheetPending > 0 && ` · ${sheetPending} change${sheetPending === 1 ? "" : "s"} waiting to be copied`}
        </p>
        {msg && <p className={styles.flash}>{msg}</p>}
        {error && <p className={styles.flashError}>{error}</p>}

        <nav aria-label="Filter by status" className={styles.tabs}>
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/admin/leads?${new URLSearchParams({ status: t.key, ...(search ? { q: search } : {}), ...(mine ? { assigned: "me" } : {}) })}`}
              className={styles.tab}
              aria-current={status === t.key ? "page" : undefined}
            >
              {t.label} <span className={styles.tabCount}>{counts[t.key as keyof typeof counts] ?? 0}</span>
            </Link>
          ))}
        </nav>

        <form method="get" action="/admin/leads" className={styles.filterBar}>
          <input type="hidden" name="status" value={status} />
          <label htmlFor="q" className="sr-only">
            Search
          </label>
          <input id="q" name="q" type="search" defaultValue={search} placeholder="Search name, email, phone or reference" className={styles.input} maxLength={100} />
          <label className={styles.checkLabel}>
            <input type="checkbox" name="assigned" value="me" defaultChecked={mine} /> Only mine
          </label>
          <button type="submit" className={`btn btn-primary ${styles.btnSm}`}>
            Search
          </button>
        </form>

        <section className={`${styles.card} ${styles.cardWide}`} aria-label="Requests">
          {rows.length === 0 ? (
            <p className={styles.muted}>No requests here{search ? " match that search" : ""}.</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">Received</th>
                    <th scope="col">Student</th>
                    <th scope="col">Plan</th>
                    <th scope="col">Phone</th>
                    <th scope="col">Status</th>
                    <th scope="col">Assigned</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((l) => {
                    const waitingMin = (now.getTime() - l.created_at.getTime()) / 60000;
                    const late = l.status === "new" && waitingMin > 120;
                    return (
                      <tr key={l.id}>
                        <td>
                          <span title={formatIst(l.created_at)}>{relative(l.created_at, now)}</span>
                          {late && <span className={styles.late}> · waiting</span>}
                        </td>
                        <td>
                          <Link href={`/admin/leads/${l.id}`}>
                            <strong>{l.student_name}</strong>
                          </Link>
                          <div className={styles.small}>{l.ref}</div>
                        </td>
                        <td>
                          {l.destination ? (
                            <>
                              {l.destination} · {l.study_level}
                              <div className={styles.small}>{l.intake}</div>
                            </>
                          ) : (
                            <span className={styles.small}>Not given yet</span>
                          )}
                        </td>
                        <td>{l.phone}</td>
                        <td>
                          <span className={`${styles.badge} ${styles[`lead_${l.status}`] ?? ""}`}>{LEAD_STATUS_LABEL[l.status]}</span>
                          {l.stage !== "complete" && (
                            <div style={{ marginTop: 4 }}>
                              <span className={`${styles.badge} ${styles[`stage_${l.stage}`] ?? ""}`}>{LEAD_STAGE_LABEL[l.stage]}</span>
                            </div>
                          )}
                        </td>
                        <td className={styles.small}>{l.assigned_to ? nameOf(ppl.get(l.assigned_to), l.assigned_to) : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 && (
            <div className={styles.row} style={{ marginTop: 14 }}>
              {page > 1 && <Link href={`/admin/leads${qs({ page: String(page - 1) })}`}>← Newer</Link>}
              <span className={styles.small}>
                Page {page} of {pages}
              </span>
              {page < pages && <Link href={`/admin/leads${qs({ page: String(page + 1) })}`}>Older →</Link>}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
