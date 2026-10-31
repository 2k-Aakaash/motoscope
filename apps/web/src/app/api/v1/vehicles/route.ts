import { clientKey, tryAcquire } from "@/lib/http/rate-limit";
import { route } from "@/lib/http/route";
import { vehicleError, vehicleErrorFrom, vehicleJson } from "@/lib/vehicles/envelope";
import { parseVehiclesQuery } from "@/lib/vehicles/query";
import { listVehicles } from "@/lib/vehicles/service";

export const dynamic = "force-dynamic";

/**
 * Marketplace vehicles from Carapis for one activated source.
 * Query: source (required), manufacturer|make, model, q, year_min, year_max, price_min, price_max + currency,
 * engine_cc_min, engine_cc_max, fuel_type, transmission, body_type, is_new, available_only, page, limit (1–50).
 */
export const GET = route({}, async ({ request, url, correlationId }) => {
  if (!tryAcquire("provider", clientKey(request))) {
    return vehicleError("RATE_LIMITED", "Too many requests. Try again in a minute.", 429);
  }
  try {
    return vehicleJson({ ...(await listVehicles(parseVehiclesQuery(url.searchParams))) });
  } catch (error) {
    return vehicleErrorFrom(error, correlationId);
  }
});
