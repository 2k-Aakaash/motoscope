import {
  CARAPIS_DEFAULT_BASE_URL,
  enabledVehicleSources,
  isCarapisConfigured,
  normaliseBaseUrl,
} from "@/lib/carapis/config";
import { route } from "@/lib/http/route";

export const dynamic = "force-dynamic";

/**
 * Integration status without calling the provider (status checks must not spend paid quota).
 * Never returns the key — only whether one is configured.
 */
export const GET = route({ rateLimit: "public-read" }, async () => {
  let baseUrl = CARAPIS_DEFAULT_BASE_URL;
  let baseUrlValid = true;
  try {
    baseUrl = normaliseBaseUrl(process.env.CARAPIS_BASE_URL);
  } catch {
    baseUrlValid = false;
  }
  const body = {
    success: true,
    provider: "carapis",
    data: {
      configured: isCarapisConfigured(),
      baseUrl: baseUrlValid ? baseUrl : null,
      baseUrlValid,
      enabledSources: enabledVehicleSources(),
      endpoints: { list: "/vehicles/", detail: "/vehicles/{id}/", sources: "/sources/" },
      activation: "/api/v1/vehicles/sources",
    },
  };
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
});
