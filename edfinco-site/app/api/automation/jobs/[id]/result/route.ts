// Writer API — the Claude routine submits the finished article here. The website validates it
// (lib/server/post-checks.ts); a 422 lists the errors so the writer can fix and resubmit.
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { bearer, json, methodNotAllowed, readCapped } from "@/lib/server/http";
import { authJob, countSubmission, MAX_SUBMISSIONS } from "@/lib/server/jobs";
import { parseSubmission } from "@/lib/server/post-checks";
import { acceptSubmission, writerGaveUp } from "@/lib/server/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 200_000;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const db = await getDb();
  const job = await authJob(db, id, bearer(request));
  if (!job) return json({ ok: false, error: "Unauthorized or expired job. Stop." }, 401);

  if (!(request.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return json({ ok: false, errors: ["Send the result as Content-Type: application/json."] }, 415);
  }
  const submissions = await countSubmission(db, job.id);
  if (submissions > MAX_SUBMISSIONS) {
    await writerGaveUp(db, job, `The writer sent ${MAX_SUBMISSIONS} submissions that failed the checks.`);
    return json({ ok: false, error: "Too many submissions. Stop." }, 429);
  }

  const raw = await readCapped(request, MAX_BODY);
  if (raw === null) return json({ ok: false, errors: ["Result is too large."] }, 413);
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return json({ ok: false, errors: ["Body is not valid JSON."] }, 400);
  }
  const parsed = parseSubmission(data);
  if (!parsed.value) return json({ ok: false, errors: parsed.errors }, 422);

  const result = await acceptSubmission(db, job, parsed.value);
  return json(
    { ...result.body, ...(result.status === 422 ? { submissionsLeft: MAX_SUBMISSIONS - submissions } : {}) },
    result.status
  );
}

export const GET = () => methodNotAllowed("POST");
