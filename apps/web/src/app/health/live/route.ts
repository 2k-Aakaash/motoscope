export const dynamic = "force-dynamic";

/** Liveness: the process is serving requests (no dependency checks). */
export function GET() {
  return new Response("Healthy", {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
