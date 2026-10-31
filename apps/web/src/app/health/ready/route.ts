import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { logger } from "@/lib/logging/logger";

export const dynamic = "force-dynamic";

/** Readiness: the database answers. 503 when it does not. */
export async function GET() {
  const headers = { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" };
  try {
    await db().execute(sql`select 1`);
    return new Response("Healthy", { headers });
  } catch (error) {
    logger.warn("Readiness check failed", {}, error);
    return new Response("Unhealthy", { status: 503, headers });
  }
}
