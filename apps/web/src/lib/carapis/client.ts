import "server-only";
import type { CarapisConfig } from "./config";
import { CarapisError, errorForStatus } from "./errors";
import type {
  CarapisPage,
  CarapisSource,
  CarapisVehicle,
  CarapisVehicleDetail,
  CarapisVehicleQuery,
} from "./types";

export const CARAPIS_TIMEOUT_MS = 10_000;
/** Listing data is reused for 10 minutes (availability changes; quota is counted per request). */
export const LISTINGS_REVALIDATE_SECONDS = 600;
/** The account's source list changes rarely. */
export const SOURCES_REVALIDATE_SECONDS = 3600;

interface RequestOptions {
  timeoutMs?: number;
  revalidate?: number;
  /** Injected in tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

export function buildUrl(baseUrl: string, path: string, params: Record<string, unknown> = {}): string {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * One GET against Carapis. Single attempt — no automatic retries, so 401/403/429 are never hammered.
 * Error bodies seen live: `{ code, detail }` and `{ detail, valid_parameters }` (documented: `{ error: { code } }`);
 * only the code is kept, for logs. Provider text is never returned to MotoScope clients.
 */
async function getJson<T>(
  config: CarapisConfig,
  url: string,
  {
    timeoutMs = CARAPIS_TIMEOUT_MS,
    revalidate = LISTINGS_REVALIDATE_SECONDS,
    fetchImpl = fetch,
  }: RequestOptions,
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate, tags: ["carapis"] },
    });
  } catch (error) {
    const name = (error as { name?: string } | null)?.name;
    if (name === "TimeoutError" || name === "AbortError") throw new CarapisError("CARAPIS_TIMEOUT");
    throw new CarapisError("CARAPIS_UNAVAILABLE");
  }

  const text = await response.text().catch(() => "");
  let body: unknown;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = undefined;
  }

  if (!response.ok) {
    const b = body as { code?: unknown; error?: { code?: unknown } } | undefined;
    const code = b?.error?.code ?? b?.code;
    throw errorForStatus(response.status, typeof code === "string" ? code : undefined);
  }
  if (body === undefined || body === null || typeof body !== "object") {
    throw new CarapisError("CARAPIS_INVALID_RESPONSE", undefined, response.status);
  }
  return body as T;
}

/** GET /vehicles/ — paginated list (verified). */
export async function fetchVehicles(
  config: CarapisConfig,
  query: CarapisVehicleQuery,
  options: RequestOptions = {},
): Promise<CarapisPage<CarapisVehicle>> {
  const body = await getJson<CarapisPage<CarapisVehicle>>(
    config,
    buildUrl(config.baseUrl, "/vehicles/", { ...query }),
    options,
  );
  if (Array.isArray(body) || (body.results !== undefined && !Array.isArray(body.results))) {
    throw new CarapisError("CARAPIS_INVALID_RESPONSE");
  }
  return body;
}

/** GET /vehicles/{id}/ — one vehicle with detail-only fields (verified). */
export async function fetchVehicle(
  config: CarapisConfig,
  id: string,
  options: RequestOptions = {},
): Promise<CarapisVehicleDetail> {
  const body = await getJson<CarapisVehicleDetail>(
    config,
    buildUrl(config.baseUrl, `/vehicles/${encodeURIComponent(id)}/`),
    options,
  );
  if (Array.isArray(body)) throw new CarapisError("CARAPIS_INVALID_RESPONSE");
  return body;
}

/** GET /sources/ — the sources this key can query (verified: a plain JSON array). */
export async function fetchSources(
  config: CarapisConfig,
  options: RequestOptions = {},
): Promise<CarapisSource[]> {
  const body = await getJson<unknown>(config, buildUrl(config.baseUrl, "/sources/"), {
    revalidate: SOURCES_REVALIDATE_SECONDS,
    ...options,
  });
  const list = Array.isArray(body) ? body : (body as { results?: unknown }).results;
  if (!Array.isArray(list)) throw new CarapisError("CARAPIS_INVALID_RESPONSE");
  return list as CarapisSource[];
}
