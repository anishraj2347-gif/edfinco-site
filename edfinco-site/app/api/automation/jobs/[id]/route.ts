// Writer API — the Claude routine fetches its job here (Bearer = the per-job token from the fire
// payload). Returns the writing rules, the task and the context; never anything else.
import type { NextRequest } from "next/server";
import { config } from "@/lib/server/config";
import { getDb } from "@/lib/server/db";
import { bearer, json, methodNotAllowed } from "@/lib/server/http";
import { authJob, MAX_SUBMISSIONS } from "@/lib/server/jobs";
import { existingTitles, getPostById } from "@/lib/server/posts";
import { istDate } from "@/lib/server/schedule";
import { openTopicCount } from "@/lib/server/topics";
import { OUTPUT_CONTRACT, taskText, WRITING_RULES, type JobBrief } from "@/lib/server/writer-instructions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const db = await getDb();
  const job = await authJob(db, id, bearer(request));
  if (!job) return json({ ok: false, error: "Unauthorized or expired job. Stop." }, 401);

  const post = await getPostById(db, job.post_id);
  if (!post || !["writing", "revising"].includes(post.status)) {
    return json({ ok: false, error: "This job is no longer needed. Stop." }, 410);
  }

  const revise = job.kind === "revise";
  const brief: JobBrief = {
    kind: job.kind,
    publishDate: istDate(post.slot_at ?? new Date()),
    topic: post.topic,
    image: post.image ? { src: post.image, alt: post.image_alt ?? "" } : null,
    existingTitles: (await existingTitles(db)).filter((t) => t !== post.title),
    proposeNewTopics: !revise && (await openTopicCount(db)) < 5,
    feedback: revise ? post.feedback : null,
    currentDraft: revise
      ? {
          title: post.title,
          description: post.description,
          tags: post.tags,
          body: post.body,
          sources: post.sources,
          version: post.version,
        }
      : null,
  };

  return json({
    ok: true,
    job: { id: job.id, kind: job.kind, publishDate: brief.publishDate, submissionsLeft: MAX_SUBMISSIONS - job.submissions },
    instructions: `${WRITING_RULES}\n\n${taskText(brief)}\n\n${OUTPUT_CONTRACT}`,
    context: {
      topic: brief.topic,
      headerImage: brief.image,
      existingTitles: brief.existingTitles,
      proposeNewTopics: brief.proposeNewTopics,
      feedback: brief.feedback,
      currentDraft: brief.currentDraft,
    },
    submitUrl: `${config.appUrl}/api/automation/jobs/${job.id}/result`,
    failUrl: `${config.appUrl}/api/automation/jobs/${job.id}/fail`,
  });
}

export const POST = () => methodNotAllowed("GET");
