import "server-only";
import { fetchListings, CARAPIS_REVALIDATE_SECONDS } from "@/lib/carapis/client";
import { readCarapisConfig } from "@/lib/carapis/config";
import { CarapisError } from "@/lib/carapis/errors";
import { normalizeListings, type MarketplaceVehicle } from "@/lib/carapis/normalize";
import type { CarapisListingsQuery } from "@/lib/carapis/types";
import { logger } from "@/lib/logging/logger";

export interface VehicleListResult {
  data: MarketplaceVehicle[];
  pagination: { count: number; page: number; limit: number };
  meta: {
    source: string;
    retrievedAt: string;
    /** Provider responses may be served from a cache up to this old; listings are not real-time. */
    maxAgeSeconds: number;
    dataType: "marketplace_listing";
    notice: string;
  };
}

export const MARKETPLACE_NOTICE =
  "Third-party marketplace listings. Prices are sellers' asking prices in the listed currency, not official or ex-showroom prices.";

/**
 * Lists marketplace vehicles from Carapis. Shared by the /api/v1/vehicles routes and the server-rendered listings page,
 * so the provider is only ever called from the server.
 */
export async function listVehicles(
  query: CarapisListingsQuery,
  options: { fetchImpl?: typeof fetch; env?: NodeJS.ProcessEnv } = {},
): Promise<VehicleListResult> {
  const config = readCarapisConfig(options.env);
  if (!config) throw new CarapisError("CARAPIS_NOT_CONFIGURED");

  try {
    const response = await fetchListings(config, query, { fetchImpl: options.fetchImpl });
    const data = normalizeListings(response.results);
    return {
      data,
      pagination: {
        count: typeof response.count === "number" ? response.count : data.length,
        page: typeof response.page === "number" ? response.page : (query.page ?? 1),
        limit: typeof response.limit === "number" ? response.limit : (query.limit ?? data.length),
      },
      meta: {
        source: query.source,
        retrievedAt: new Date().toISOString(),
        maxAgeSeconds: CARAPIS_REVALIDATE_SECONDS,
        dataType: "marketplace_listing",
        notice: MARKETPLACE_NOTICE,
      },
    };
  } catch (error) {
    if (error instanceof CarapisError) {
      // Never log the key or query values; the provider code/status is enough to diagnose.
      logger.warn("Carapis request failed", {
        code: error.code,
        upstreamCode: error.upstreamCode,
        upstreamStatus: error.upstreamStatus,
        source: query.source,
      });
    }
    throw error;
  }
}
