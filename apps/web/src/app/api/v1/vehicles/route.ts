import { clientKey, tryAcquire } from "@/lib/http/rate-limit";
import { route } from "@/lib/http/route";
import { vehicleError, vehicleErrorFrom, vehicleSuccess } from "@/lib/vehicles/envelope";
import { parseVehiclesQuery } from "@/lib/vehicles/query";
import { listVehicles } from "@/lib/vehicles/service";

export const dynamic = "force-dynamic";

/**
 * Marketplace listings from Carapis (`GET /listings`).
 * Query: source (required), make, model, year_min, year_max, price_min, price_max, limit (1–50, default 20), page.
 */
export const GET = route({}, async ({ request, url, correlationId }) => {
  if (!tryAcquire("provider", clientKey(request))) {
    return vehicleError("RATE_LIMITED", "Too many requests. Try again in a minute.", 429);
  }
  try {
    return vehicleSuccess(await listVehicles(parseVehiclesQuery(url.searchParams)));
  } catch (error) {
    return vehicleErrorFrom(error, correlationId);
  }
});
