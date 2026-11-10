import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import AdminBar from "@/components/AdminBar";
import { ChecksBox, PostPreview } from "@/components/PostPreview";
import StatusBadge from "@/components/StatusBadge";
import { requireAdmin } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { latestJobForPost } from "@/lib/server/jobs";
import { getPostById, isLive, versionsOf } from "@/lib/server/posts";
import { formatIst, relative } from "@/lib/server/schedule";
import styles from "../../admin.module.css";

const MESSAGES: Record<string, string> = {
  approved: "Approved. It goes live at its scheduled time (or now, if that time has passed).",
  published: "Published. It's live on the website now.",
  "changes-requested": "Changes sent to the writer. You'll get the revised draft by email in a few minutes.",
  "changes-queued": "Your changes are saved, but the writer couldn't be started yet. The scheduler will retry.",
  "rejected-skip": "Rejected. Nothing will be published for this slot.",
  "rejected-replace": "Rejected. A different post will be written for this slot.",
  withdrawn: "Approval withdrawn. It's waiting for approval again.",
  unpublished: "Taken down. It's no longer on the website.",
  retrying: "The writer is retrying.",
};

export default async function AdminPostPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const admin = await requireAdmin();
  const { id } = await params;
  const db = await getDb();
  const post = await getPostById(db, id);
  if (!post) notFound();
  const q = await searchParams;
  const versions = await versionsOf(db, post.id);
  const job = await latestJobForPost(db, post.id);
  const now = new Date();
  const live = isLive(post, now);
  const msg = typeof q.msg === "string" ? MESSAGES[q.msg] : undefined;
  const error = typeof q.error === "string" ? q.error.slice(0, 200) : undefined;
  const warn = typeof q.warn === "string" ? q.warn.slice(0, 200) : undefined;
  const hasContent = post.version > 0;

  return (
    <>
      <AdminBar staff={admin} current="blog" />
      <main id="main" className={`container ${styles.main}`}>
        <p className={styles.small}>
          <Link href="/admin">← Dashboard</Link>
        </p>
        <div className={styles.spread}>
          <h1 className={styles.pageTitle}>{post.title || post.topic || "Untitled draft"}</h1>
          <StatusBadge post={post} />
        </div>
        {msg && <p className={styles.flash}>{msg}</p>}
        {warn && <p className={styles.flashWarn}>{warn}</p>}
        {error && <p className={styles.flashError}>{error}</p>}

        <div className={styles.layout2}>
          <div className={styles.stack}>
            {hasContent ? (
              <>
                <ChecksBox checks={post.checks} />
                <PostPreview post={post} />
              </>
            ) : (
              <div className={styles.card}>
                <p className={styles.muted}>
                  {post.status === "failed"
                    ? "The writer couldn't produce this draft. Retry it, or reject it so a different post is written."
                    : "The Claude writer is working on this draft. You'll get an approval email when it's ready."}
                </p>
                {post.topic && (
                  <p className={styles.small}>
                    <strong>Topic:</strong> {post.topic}
                  </p>
                )}
              </div>
            )}
          </div>

          <aside className={`${styles.stack} ${styles.actions}`} aria-label="Actions">
            <section className={styles.card}>
              <dl className={styles.kv}>
                <dt>Goes live</dt>
                <dd>{post.publish_at && post.status === "approved" ? formatIst(post.publish_at) : post.slot_at ? formatIst(post.slot_at) : "-"}</dd>
                <dt>Version</dt>
                <dd>{post.version || "-"}</dd>
                {post.approved_by && (
                  <>
                    <dt>Approved by</dt>
                    <dd>{post.approved_by}</dd>
                  </>
                )}
              </dl>
              {live && post.slug && (
                <p style={{ marginTop: 12 }}>
                  <Link href={`/blog/${post.slug}`}>View on the website</Link>
                </p>
              )}
            </section>

            {post.status === "pending_review" && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Approve</h2>
                <div className={styles.stack}>
                  <form action={`/api/admin/posts/${post.id}`} method="post">
                    <input type="hidden" name="action" value="approve" />
                    <input type="hidden" name="version" value={post.version} />
                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                      Approve version {post.version}
                    </button>
                  </form>
                  <form action={`/api/admin/posts/${post.id}`} method="post">
                    <input type="hidden" name="action" value="publish-now" />
                    <button type="submit" className={`btn ${styles.btnGhost} ${styles.btnSm}`} style={{ width: "100%" }}>
                      Publish now instead
                    </button>
                  </form>
                </div>
              </section>
            )}

            {post.status === "pending_review" && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Request changes</h2>
                <form action={`/api/admin/posts/${post.id}`} method="post" className={styles.form}>
                  <input type="hidden" name="action" value="changes" />
                  <input type="hidden" name="version" value={post.version} />
                  <label htmlFor="feedback" className="sr-only">
                    What should change?
                  </label>
                  <textarea
                    id="feedback"
                    name="feedback"
                    required
                    minLength={5}
                    maxLength={4000}
                    className={styles.textarea}
                    placeholder="e.g. Make the intro shorter and add a section on what to ask the lender."
                  />
                  <button type="submit" className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
                    Send to the writer
                  </button>
                </form>
              </section>
            )}

            {post.status === "approved" && !live && (
              <section className={styles.card}>
                <form action={`/api/admin/posts/${post.id}`} method="post" className={styles.stack}>
                  <button type="submit" name="action" value="publish-now" className="btn btn-primary">
                    Publish now
                  </button>
                  <button type="submit" name="action" value="withdraw" className={`btn ${styles.btnGhost} ${styles.btnSm}`}>
                    Withdraw approval
                  </button>
                </form>
              </section>
            )}

            {post.status === "failed" && (
              <section className={styles.card}>
                <form action={`/api/admin/posts/${post.id}`} method="post">
                  <input type="hidden" name="action" value="retry" />
                  <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                    Retry the writer
                  </button>
                </form>
              </section>
            )}

            {live && (
              <section className={styles.card}>
                <form action={`/api/admin/posts/${post.id}`} method="post">
                  <input type="hidden" name="action" value="unpublish" />
                  <button type="submit" className={`btn ${styles.btnDanger} ${styles.btnSm}`} style={{ width: "100%" }}>
                    Take it off the website
                  </button>
                </form>
              </section>
            )}

            {post.status !== "rejected" && !live && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Reject</h2>
                <form action={`/api/admin/posts/${post.id}`} method="post" className={styles.stack}>
                  <button type="submit" name="action" value="reject-replace" className={`btn ${styles.btnDanger} ${styles.btnSm}`}>
                    Reject and write a different post
                  </button>
                  <button type="submit" name="action" value="reject-skip" className={`btn ${styles.btnDanger} ${styles.btnSm}`}>
                    Reject and skip this day
                  </button>
                </form>
              </section>
            )}

            {job && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Writer</h2>
                <dl className={styles.kv}>
                  <dt>Last job</dt>
                  <dd>
                    {job.kind} · {job.status}
                  </dd>
                  <dt>Attempts</dt>
                  <dd>{job.attempts}</dd>
                  {job.fired_at && (
                    <>
                      <dt>Started</dt>
                      <dd>{relative(job.fired_at, now)}</dd>
                    </>
                  )}
                </dl>
                {job.last_error && <p className={styles.small}>Last error: {job.last_error}</p>}
                {job.session_url && (
                  <p className={styles.small}>
                    <a href={job.session_url} target="_blank" rel="noopener noreferrer">
                      Open the Claude session
                    </a>
                  </p>
                )}
              </section>
            )}

            {versions.length > 0 && (
              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Versions</h2>
                <ol className={styles.list} reversed>
                  {versions.map((v) => (
                    <li key={v.version} className={styles.small}>
                      <strong>v{v.version}</strong> · {relative(v.created_at, now)}
                      {v.feedback && <p className={styles.feedbackQuote}>{v.feedback}</p>}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </aside>
        </div>
      </main>
    </>
  );
}
