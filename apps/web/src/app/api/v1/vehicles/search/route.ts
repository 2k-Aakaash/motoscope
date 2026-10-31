import { ValidationError } from "@/lib/http/errors";
import { clientKey, tryAcquire } from "@/lib/http/rate-limit";
import { route } from "@/lib/http/route";
import { vehicleError, vehicleErrorFrom, vehicleSuccess } from "@/lib/vehicles/envelope";
import { hasSearchFilter, parseVehiclesQuery } from "@/lib/vehicles/query";
import { listVehicles } from "@/lib/vehicles/service";

export const dynamic = "force-dynamic";

/**
 * Filtered search over Carapis listings. The provider has no free-text search, so this uses only its documented
 * filters and requires at least one of: make, model, year_min, year_max, price_min, price_max (plus `source`).
 */
export const GET = route({}, async ({ request, url, correlationId }) => {
  if (!tryAcquire("provider", clientKey(request))) {
    return vehicleError("RATE_LIMITED", "Too many requests. Try again in a minute.", 429);
  }
  try {
    const query = parseVehiclesQuery(url.searchParams);
    if (!hasSearchFilter(query)) {
      throw new ValidationError({
        filters: ["Provide at least one of: make, model, year_min, year_max, price_min, price_max."],
      });
    }
    return vehicleSuccess(await listVehicles(query));
  } catch (error) {
    return vehicleErrorFrom(error, correlationId);
  }
});
