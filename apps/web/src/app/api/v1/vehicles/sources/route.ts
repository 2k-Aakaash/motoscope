import { route } from "@/lib/http/route";
import { vehicleErrorFrom, vehicleJson } from "@/lib/vehicles/envelope";
import { getSourceStatuses } from "@/lib/vehicles/service";

export const dynamic = "force-dynamic";

/**
 * MotoScope's vehicle sources and whether each is activated on the provider account (from the provider's
 * authoritative `/sources/` list, cached for an hour). Sources not activated are reported, never simulated.
 */
export const GET = route({ rateLimit: "public-read" }, async ({ correlationId }) => {
  try {
    const sources = await getSourceStatuses();
    return vehicleJson({ data: sources, meta: { checkedAt: new Date().toISOString() } });
  } catch (error) {
    return vehicleErrorFrom(error, correlationId);
  }
});
