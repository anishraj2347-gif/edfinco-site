import type { ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { headers } from "next/headers";
import AdminBar from "@/components/AdminBar";
import { ChecksBox, PostPreview } from "@/components/PostPreview";
import { getDb } from "@/lib/server/db";
import { isLive, lookupReviewToken } from "@/lib/server/posts";
import { allow } from "@/lib/server/rate-limit";
import { formatIst } from "@/lib/server/schedule";
import styles from "@/app/admin/admin.module.css";

// Opened from the approval email. Loading this page changes nothing; approving or requesting
// changes needs a click (POST to /api/review/<token>), and the link only works for the version
// it was sent for, while that version is still waiting for approval.
export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { token } = await params;
  const q = await searchParams;
  const db = await getDb();
  const ip = ((await headers()).get("x-forwarded-for") ?? "local").split(",")[0].trim();
  const allowed = await allow(db, `review-view:${ip}`, 60, 3600);
  const found = allowed ? await lookupReviewToken(db, token) : null;
  const done = typeof q.done === "string" ? q.done : "";

  const shell = (inner: ReactNode) => (
    <>
      <AdminBar />
      <main id="main" className={`container ${styles.main}`}>
        {inner}
      </main>
    </>
  );

  if (!found) {
    return shell(
      <div className={styles.loginWrap}>
        <h1 className={styles.pageTitle}>This link has expired</h1>
        <p className={styles.lede}>
          Approval links work for 7 days, and only for the newest version of a draft. Use the most recent email, or sign in to the dashboard.
        </p>
        <Link href="/admin" className="btn btn-primary">
          Open the dashboard
        </Link>
      </div>
    );
  }

  const { post, tokenVersion } = found;
  const stale = tokenVersion !== post.version;
  const when = post.slot_at ? formatIst(post.slot_at) : "as soon as you approve it";

  let state: ReactNode = null;
  if (done === "approved" || (post.status === "approved" && !stale)) {
    state = (
      <p className={styles.flash}>
        Approved, thank you. {isLive(post) ? "It's live on the website now." : `It goes live ${post.publish_at ? formatIst(post.publish_at) : when}.`}
      </p>
    );
  } else if (done === "changes" || post.status === "revising") {
    state = <p className={styles.flash}>Thanks. The writer is making your changes. The revised draft will arrive by email in a few minutes.</p>;
  } else if (stale) {
    state = <p className={styles.flashWarn}>A newer version (v{post.version}) has been sent to your email. Please use that email instead.</p>;
  } else if (post.status === "rejected") {
    state = <p className={styles.flashWarn}>This post was rejected in the dashboard.</p>;
  } else if (done === "stale") {
    state = <p className={styles.flashWarn}>This version was already handled.</p>;
  }

  const canAct = !stale && post.status === "pending_review";

  // An older version's link only says a newer one exists; it doesn't show the current draft.
  if (stale) {
    return shell(
      <div className={styles.loginWrap}>
        <h1 className={styles.pageTitle}>A newer version exists</h1>
        {state}
        <Link href="/admin" className="btn btn-primary">
          Open the dashboard
        </Link>
      </div>
    );
  }

  return shell(
    <>
      <h1 className={styles.pageTitle}>{canAct ? "Review this blog post" : post.title}</h1>
      {canAct && (
        <p className={styles.lede}>
          Version {post.version}. It goes live <strong>{when}</strong> only if you approve it. If it isn&apos;t approved in time, nothing is published and it moves to the next day.
        </p>
      )}
      {state}
      {q.error === "feedback" && <p className={styles.flashError}>Please describe the changes (5–4000 characters).</p>}

      <div className={styles.layout2}>
        <div className={styles.stack}>
          <ChecksBox checks={post.checks} />
          <PostPreview post={post} />
        </div>
        {canAct && (
          <aside className={`${styles.stack} ${styles.actions}`} aria-label="Decision">
            <section id="approve" className={styles.card}>
              <h2 className={styles.cardTitle}>Approve</h2>
              <form action={`/api/review/${encodeURIComponent(token)}`} method="post">
                <input type="hidden" name="action" value="approve" />
                <input type="hidden" name="version" value={post.version} />
                <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                  Approve for {when}
                </button>
              </form>
            </section>
            <section id="changes" className={styles.card}>
              <h2 className={styles.cardTitle}>Request changes</h2>
              <form action={`/api/review/${encodeURIComponent(token)}`} method="post" className={styles.form}>
                <input type="hidden" name="action" value="changes" />
                <input type="hidden" name="version" value={post.version} />
                <label htmlFor="feedback" className={styles.label}>
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
              <p className={styles.small} style={{ marginTop: 10 }}>
                The revised version comes back to your email for approval.
              </p>
            </section>
          </aside>
        )}
      </div>
    </>
  );
}
