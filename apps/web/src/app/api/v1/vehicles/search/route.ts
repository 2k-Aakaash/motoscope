import { ValidationError } from "@/lib/http/errors";
import { clientKey, tryAcquire } from "@/lib/http/rate-limit";
import { route } from "@/lib/http/route";
import { vehicleError, vehicleErrorFrom, vehicleJson } from "@/lib/vehicles/envelope";
import { hasSearchFilter, parseVehiclesQuery } from "@/lib/vehicles/query";
import { listVehicles } from "@/lib/vehicles/service";

export const dynamic = "force-dynamic";

/**
 * Search within one activated source. Same parameters as /api/v1/vehicles; `q` maps to the provider's `search`
 * parameter. At least one search term or filter besides `source` is required.
 */
export const GET = route({}, async ({ request, url, correlationId }) => {
  if (!tryAcquire("provider", clientKey(request))) {
    return vehicleError("RATE_LIMITED", "Too many requests. Try again in a minute.", 429);
  }
  try {
    const query = parseVehiclesQuery(url.searchParams);
    if (!hasSearchFilter(query)) {
      throw new ValidationError({ q: ["Provide a search term (q) or at least one filter besides source."] });
    }
    return vehicleJson({ ...(await listVehicles(query)) });
  } catch (error) {
    return vehicleErrorFrom(error, correlationId);
  }
});
