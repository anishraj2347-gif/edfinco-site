// The approval workflow, shared by the scheduler, the admin dashboard, the review links and the
// writer API. Nothing here is ever published without an explicit approval.
import type { Db } from "./db";
import { config } from "./config";
import { audit } from "./audit";
import { sendToAdmins } from "./notify";
import { reviewRequestEmail, writerProblemEmail } from "./email-templates";
import { createJob, failJob, finishJob, fireJob, latestJobForPost, type JobKind, type JobRow } from "./jobs";
import {
  approve,
  createPostForSlot,
  createReviewToken,
  getPostById,
  markFailed,
  recentImages,
  resumeAfterFailure,
  saveVersion,
  startRevision,
  type PostRow,
} from "./posts";
import { checkPost, type Checks, type Submission } from "./post-checks";
import { addTopics, markTopicUsed, nextTopic } from "./topics";
import { pickImage } from "@/lib/blog-images";

export async function reviewUrlFor(db: Db, post: PostRow): Promise<string> {
  return `${config.appUrl}/review/${await createReviewToken(db, post)}`;
}

/** Emails the admins the current version with Approve / Request changes buttons. */
export async function notifyReview(db: Db, post: PostRow, revision: boolean, feedback: string | null): Promise<void> {
  const url = await reviewUrlFor(db, post);
  const sent = await sendToAdmins(reviewRequestEmail(post, url, { revision, feedback }));
  await audit(db, "system", sent.ok ? "review_email_sent" : "review_email_failed", post.id, {
    version: post.version,
    ...(sent.error ? { error: sent.error } : {}),
  });
}

async function startJob(db: Db, post: PostRow, kind: JobKind, actor: string): Promise<{ ok: boolean; error?: string }> {
  const job = await createJob(db, post.id, kind);
  const fired = await fireJob(db, job);
  await audit(db, actor, fired.ok ? "writer_started" : "writer_start_failed", post.id, {
    kind,
    ...(fired.error ? { error: fired.error } : {}),
  });
  return fired;
}

/** Creates the post for a slot and hands it to the writer. Null if the slot is already taken. */
export async function startDraftForSlot(
  db: Db,
  slot: Date,
  actor: string
): Promise<{ post: PostRow; started: boolean; error?: string } | null> {
  const topic = await nextTopic(db);
  const image = pickImage(await recentImages(db, 3));
  const post = await createPostForSlot(db, { slot, topic: topic?.title ?? null, image });
  if (!post) return null;
  if (topic) await markTopicUsed(db, topic.id, post.id);
  await audit(db, actor, "draft_scheduled", post.id, { slot: slot.toISOString(), topic: topic?.title ?? null });
  const fired = await startJob(db, post, "write", actor);
  return { post, started: fired.ok, error: fired.error };
}

export async function requestChanges(
  db: Db,
  postId: string,
  version: number,
  feedback: string,
  actor: string
): Promise<{ ok: boolean; error?: string }> {
  const post = await startRevision(db, postId, version, feedback);
  if (!post) return { ok: false, error: "This draft has already been handled or a newer version exists." };
  await audit(db, actor, "changes_requested", post.id, { version, feedback: feedback.slice(0, 500) });
  const fired = await startJob(db, post, "revise", actor);
  return { ok: true, error: fired.ok ? undefined : fired.error };
}

export async function approvePost(db: Db, postId: string, version: number, actor: string): Promise<PostRow | null> {
  const post = await approve(db, postId, version, actor);
  if (post) await audit(db, actor, "approved", post.id, { version, publishAt: post.publish_at?.toISOString() });
  return post;
}

export async function retryPost(db: Db, postId: string, actor: string): Promise<{ ok: boolean; error?: string }> {
  const post = await resumeAfterFailure(db, postId);
  if (!post) return { ok: false, error: "Only posts with a writer problem can be retried." };
  return startJob(db, post, post.version === 0 ? "write" : "revise", actor);
}

/** A submission from the writer: validate, store, email the admin. */
export async function acceptSubmission(
  db: Db,
  job: JobRow,
  sub: Submission
): Promise<{ status: number; body: Record<string, unknown> }> {
  const post = await getPostById(db, job.post_id);
  if (!post || !["writing", "revising"].includes(post.status)) {
    await failJob(db, job.id, "Post is no longer waiting for this job.");
    return { status: 410, body: { ok: false, error: "This job is no longer needed. Stop." } };
  }
  const checks: Checks = checkPost(sub);
  if (checks.errors.length) {
    await audit(db, "writer", "submission_rejected", post.id, { errors: checks.errors.slice(0, 10) });
    return { status: 422, body: { ok: false, errors: checks.errors, warnings: checks.warnings } };
  }
  const saved = await saveVersion(db, post, sub, checks);
  if (!saved) return { status: 409, body: { ok: false, error: "Post changed while writing. Stop." } };
  if (sub.newTopics.length) await addTopics(db, sub.newTopics);
  await finishJob(db, job.id);
  await audit(db, "writer", "version_submitted", saved.id, { version: saved.version, words: checks.wordCount });
  await notifyReview(db, saved, post.status === "revising", post.feedback);
  return { status: 200, body: { ok: true, version: saved.version, warnings: checks.warnings } };
}

export async function writerGaveUp(db: Db, job: JobRow, reason: string): Promise<void> {
  await failJob(db, job.id, reason);
  const post = await getPostById(db, job.post_id);
  if (!post) return;
  await markFailed(db, post.id);
  await audit(db, "writer", "writer_failed", post.id, { reason: reason.slice(0, 500) });
  await sendToAdmins(writerProblemEmail(post, reason));
}

/** For the dashboard: is the latest job for this post stuck or failed? */
export { latestJobForPost };
