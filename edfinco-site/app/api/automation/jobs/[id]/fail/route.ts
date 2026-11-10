// Writer API — the Claude routine reports that it cannot complete the job (e.g. it can't write a
// compliant article for the request). The admin is emailed the reason.
import type { NextRequest } from "next/server";
import { getDb } from "@/lib/server/db";
import { bearer, json, methodNotAllowed, readCapped } from "@/lib/server/http";
import { authJob } from "@/lib/server/jobs";
import { writerGaveUp } from "@/lib/server/workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const db = await getDb();
  const job = await authJob(db, id, bearer(request));
  if (!job) return json({ ok: false, error: "Unauthorized or expired job." }, 401);
  const raw = (await readCapped(request, 8_000)) ?? "";
  let reason = "The writer stopped without giving a reason.";
  try {
    const data = JSON.parse(raw) as { reason?: unknown };
    if (typeof data.reason === "string" && data.reason.trim()) reason = data.reason.trim().slice(0, 1000);
  } catch {
    /* keep the default reason */
  }
  await writerGaveUp(db, job, `The writer reported: ${reason}`);
  return json({ ok: true });
}

export const GET = () => methodNotAllowed("POST");
