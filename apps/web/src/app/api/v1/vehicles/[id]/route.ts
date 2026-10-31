import { CarapisError } from "@/lib/carapis/errors";
import { clientKey, tryAcquire } from "@/lib/http/rate-limit";
import { route } from "@/lib/http/route";
import { MARKETPLACE_NOTICE } from "@/lib/vehicles/service";
import { vehicleError, vehicleErrorFrom, vehicleJson } from "@/lib/vehicles/envelope";
import { vehicleIdSchema } from "@/lib/vehicles/query";
import { getVehicle } from "@/lib/vehicles/service";

export const dynamic = "force-dynamic";

/** One vehicle via the provider's detail endpoint (adds listing URL, engine cc, seat count…). */
export const GET = route<{ id: string }>({}, async ({ request, params, correlationId }) => {
  if (!tryAcquire("provider", clientKey(request))) {
    return vehicleError("RATE_LIMITED", "Too many requests. Try again in a minute.", 429);
  }
  try {
    if (!vehicleIdSchema.safeParse(params.id).success) throw new CarapisError("CARAPIS_NOT_FOUND");
    const vehicle = await getVehicle(params.id);
    return vehicleJson({
      source: vehicle.source,
      data: vehicle,
      meta: {
        retrievedAt: new Date().toISOString(),
        dataType: "marketplace_listing",
        notice: MARKETPLACE_NOTICE,
      },
    });
  } catch (error) {
    return vehicleErrorFrom(error, correlationId);
  }
});
