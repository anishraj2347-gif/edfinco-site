// Scheduler tick — called hourly by .github/workflows/blog-scheduler.yml (or any cron service)
// with `Authorization: Bearer <CRON_SECRET>`. Idempotent and lock-protected; see lib/server/tick.ts.
import type { NextRequest } from "next/server";
import { config } from "@/lib/server/config";
import { safeEqual } from "@/lib/server/crypto";
import { bearer, json, methodNotAllowed } from "@/lib/server/http";
import { runTick } from "@/lib/server/tick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handle(request: NextRequest): Promise<Response> {
  if (!config.cronSecret) return json({ ok: false, error: "CRON_SECRET is not configured." }, 503);
  const token = bearer(request);
  if (!token || !safeEqual(token, config.cronSecret)) return json({ ok: false, error: "Unauthorized." }, 401);
  const result = await runTick("cron");
  return json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
export const PUT = () => methodNotAllowed("GET, POST");
export const DELETE = () => methodNotAllowed("GET, POST");
