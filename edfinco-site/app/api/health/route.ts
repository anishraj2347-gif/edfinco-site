// Liveness check for the host (render.yaml → healthCheckPath). It answers as soon as the server is
// up and deliberately touches nothing else: no database, no secrets, no request data echoed.
export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response("ok", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
