import type { ReactNode } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { headers } from "next/headers";
import AdminBar from "@/components/AdminBar";
import { ChecksBox, PostPreview } from "@/components/PostPreview";
import ReviewChat, { type ChatMessage } from "@/components/ReviewChat";
import { getDb } from "@/lib/server/db";
import { isLive, lookupReviewToken, versionsOf, type PostRow } from "@/lib/server/posts";
import { allow } from "@/lib/server/rate-limit";
import { formatIst } from "@/lib/server/schedule";
import styles from "@/app/admin/admin.module.css";

// Opened from the approval email: the newest version of the draft plus a chat with the AI writer.
// Loading this page changes nothing. Asking for changes or approving needs a click (POST to
// /api/review/<token>), and acts only on the version shown here while it is still awaiting review.
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
  const allowed = await allow(db, `review-view:${ip}`, 120, 3600);
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
          Review links work for 3 days. Use the most recent email about this post, or sign in to the dashboard.
        </p>
        <Link href="/admin" className="btn btn-primary">
          Open the dashboard
        </Link>
      </div>
    );
  }

  const { post } = found;
  const when = post.slot_at ? formatIst(post.slot_at) : "as soon as you approve it";
  const messages = await conversation(post);

  let flash: ReactNode = null;
  if (done === "approved" && post.status === "approved") {
    flash = <p className={styles.flash}>Approved, thank you.</p>;
  } else if (done === "stale") {
    flash = <p className={styles.flashWarn}>The draft changed before your click reached us, so nothing was done. Here is the newest version.</p>;
  }

  async function conversation(p: PostRow): Promise<ChatMessage[]> {
    const out: ChatMessage[] = [];
    const versions = (await versionsOf(db, p.id)).reverse();
    for (const v of versions) {
      if (v.feedback) out.push({ id: `ask-${v.version}`, who: "editor", text: v.feedback });
      const note = v.writer_note?.trim();
      const text =
        v.version === 1
          ? `Here's the first draft: "${v.title}".${note ? ` ${note}` : ""} Read it on this page, then tell me what to change, or approve it.`
          : note || `Here's version ${v.version} with your changes.`;
      out.push({ id: `v-${v.version}`, who: "writer", text, meta: `Version ${v.version}, ${formatIst(v.created_at)}` });
    }
    if (p.status === "revising" && p.feedback) {
      out.push({ id: `ask-${p.version + 1}`, who: "editor", text: p.feedback });
    }
    if (p.status === "approved") {
      // approved_by is an admin's email, or "approval email link" when approved from this page.
      const by = p.approved_by?.includes("@") ? ` by ${p.approved_by}` : "";
      out.push({
        id: "approved",
        who: "system",
        text: isLive(p)
          ? `Approved${by}. It's live on the website now.`
          : `Approved${by}. It goes live ${p.publish_at ? formatIst(p.publish_at) : when}. To change it before then, withdraw the approval in the dashboard.`,
      });
    } else if (p.status === "failed") {
      out.push({
        id: "failed",
        who: "system",
        text: "The writer couldn't finish this version. Open the dashboard and press Retry, or reject the post.",
      });
    } else if (p.status === "rejected") {
      out.push({ id: "rejected", who: "system", text: "This post was rejected in the dashboard." });
    }
    return out;
  }

  return shell(
    <>
      <h1 className={styles.pageTitle}>{post.title || "Blog post draft"}</h1>
      {post.status === "pending_review" && (
        <p className={styles.lede}>
          Version {post.version}. It goes live <strong>{when}</strong> only if you approve it. If it isn&apos;t approved in time, nothing is
          published and it moves to the next day. <a href="#chat">Go to the chat</a>
        </p>
      )}
      {flash}

      <div className={styles.chatLayout}>
        <div className={styles.stack}>
          <ChecksBox checks={post.checks} />
          <PostPreview post={post} />
        </div>
        <ReviewChat
          key={`${post.version}-${post.status}`}
          token={token}
          version={post.version}
          status={post.status}
          messages={messages}
          when={when}
          feedbackError={q.error === "feedback"}
        />
      </div>
    </>
  );
}
