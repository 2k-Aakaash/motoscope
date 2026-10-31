import "server-only";
import { fetchSources, fetchVehicle, fetchVehicles, LISTINGS_REVALIDATE_SECONDS } from "@/lib/carapis/client";
import {
  CarapisConfigError,
  enabledVehicleSources,
  readCarapisConfig,
  type CarapisConfig,
} from "@/lib/carapis/config";
import { CarapisError } from "@/lib/carapis/errors";
import { normalizeVehicle, normalizeVehicles, type Vehicle } from "@/lib/carapis/normalize";
import { indianSources } from "@/lib/carapis/sources";
import type { CarapisSource, CarapisVehicleQuery } from "@/lib/carapis/types";
import { logger } from "@/lib/logging/logger";

export const MARKETPLACE_NOTICE =
  "Third-party marketplace listings. Prices are sellers' asking prices in the listed currency, not official, ex-showroom or on-road prices.";

interface Options {
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}

export interface VehicleListResult {
  source: string;
  data: Vehicle[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
    total: number | null;
    totalPages: number | null;
  };
  meta: { retrievedAt: string; maxAgeSeconds: number; dataType: "marketplace_listing"; notice: string };
}

export type SourceStatus = "available" | "not_activated";

export interface SourceStatusEntry {
  code: string;
  name: string;
  status: SourceStatus;
  /** Provider availability for activated sources ("live" or "on_demand"). */
  providerAvailability: string | null;
  country: string | null;
  lastParsedAt: string | null;
  docsDescription: string | null;
}

function config(env?: NodeJS.ProcessEnv): CarapisConfig {
  try {
    const c = readCarapisConfig(env);
    if (!c) throw new CarapisError("CARAPIS_NOT_CONFIGURED");
    return c;
  } catch (error) {
    if (error instanceof CarapisConfigError) {
      logger.error("Carapis configuration invalid", { reason: error.message });
      throw new CarapisError("CARAPIS_MISCONFIGURED");
    }
    throw error;
  }
}

function logProviderError(error: unknown, context: Record<string, unknown>) {
  if (error instanceof CarapisError && error.upstreamStatus !== undefined) {
    // Never log the key, headers or query values.
    logger.warn("Carapis request failed", {
      code: error.code,
      upstreamCode: error.upstreamCode,
      upstreamStatus: error.upstreamStatus,
      ...context,
    });
  }
}

/** Status of each MotoScope-enabled source on the account (one cached `/sources/` call). */
export async function getSourceStatuses(options: Options = {}): Promise<SourceStatusEntry[]> {
  const c = config(options.env);
  let accountSources: CarapisSource[];
  try {
    accountSources = await fetchSources(c, { fetchImpl: options.fetchImpl });
  } catch (error) {
    logProviderError(error, { endpoint: "sources" });
    throw error;
  }
  const byCode = new Map(accountSources.filter((s) => typeof s?.code === "string").map((s) => [s.code!, s]));
  return enabledVehicleSources(options.env).map((code) => {
    const account = byCode.get(code);
    const docs = indianSources.find((s) => s.code === code);
    return {
      code,
      name: account?.name ?? docs?.name ?? code,
      status: account ? "available" : "not_activated",
      providerAvailability: account?.availability ?? null,
      country: account?.country ?? null,
      lastParsedAt: account?.last_parsed_at ?? null,
      docsDescription: docs?.docsDescription ?? null,
    };
  });
}

/**
 * Throws unless `source` is enabled for MotoScope AND activated on the account. The provider answers an inactive
 * source with an empty 200 (verified), so activation must be checked against `/sources/`, never inferred from results.
 */
async function assertSourceAvailable(source: string, options: Options): Promise<void> {
  if (!enabledVehicleSources(options.env).includes(source)) throw new CarapisError("UNSUPPORTED_SOURCE");
  const status = (await getSourceStatuses(options)).find((s) => s.code === source);
  if (status?.status !== "available") throw new CarapisError("SOURCE_NOT_ACTIVATED");
}

export async function listVehicles(
  query: CarapisVehicleQuery,
  options: Options = {},
): Promise<VehicleListResult> {
  const c = config(options.env);
  await assertSourceAvailable(query.source, options);
  try {
    const page = await fetchVehicles(c, query, { fetchImpl: options.fetchImpl });
    const data = normalizeVehicles(page.results);
    const pageNumber = typeof page.page === "number" ? page.page : (query.page ?? 1);
    return {
      source: query.source,
      data,
      pagination: {
        page: pageNumber,
        limit: typeof page.page_size === "number" ? page.page_size : (query.page_size ?? data.length),
        hasMore: typeof page.has_next === "boolean" ? page.has_next : false,
        total: typeof page.count === "number" ? page.count : null,
        totalPages: typeof page.pages === "number" ? page.pages : null,
      },
      meta: {
        retrievedAt: new Date().toISOString(),
        maxAgeSeconds: LISTINGS_REVALIDATE_SECONDS,
        dataType: "marketplace_listing",
        notice: MARKETPLACE_NOTICE,
      },
    };
  } catch (error) {
    logProviderError(error, { endpoint: "vehicles", source: query.source });
    throw error;
  }
}

/** One vehicle with detail-only fields. Vehicles from sources MotoScope does not serve are reported as not found. */
export async function getVehicle(id: string, options: Options = {}): Promise<Vehicle> {
  const c = config(options.env);
  let vehicle: Vehicle | null;
  try {
    vehicle = normalizeVehicle(await fetchVehicle(c, id, { fetchImpl: options.fetchImpl }));
  } catch (error) {
    logProviderError(error, { endpoint: "vehicle" });
    throw error;
  }
  if (!vehicle) throw new CarapisError("CARAPIS_INVALID_RESPONSE");
  if (!vehicle.source || !enabledVehicleSources(options.env).includes(vehicle.source)) {
    throw new CarapisError("CARAPIS_NOT_FOUND");
  }
  return vehicle;
}
