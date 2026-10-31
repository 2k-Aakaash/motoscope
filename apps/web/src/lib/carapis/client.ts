import "server-only";
import type { CarapisConfig } from "./config";
import { CarapisError, errorForStatus } from "./errors";
import type { CarapisErrorBody, CarapisListingsQuery, CarapisListingsResponse } from "./types";

export const CARAPIS_TIMEOUT_MS = 10_000;
/** Responses are reused for 30 minutes: quotas count every request (free plan: 100/day). */
export const CARAPIS_REVALIDATE_SECONDS = 1800;

interface RequestOptions {
  timeoutMs?: number;
  /** Injected in tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

/** Builds the documented query string, omitting undefined values. */
export function buildListingsUrl(baseUrl: string, query: CarapisListingsQuery): string {
  const url = new URL(`${baseUrl}/listings`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/**
 * GET /listings (documented Carapis endpoint). One attempt only: no automatic retries, so a rate limit (429) or an
 * auth failure (401/403) is never hammered; the caller gets a typed CarapisError instead.
 */
export async function fetchListings(
  config: CarapisConfig,
  query: CarapisListingsQuery,
  { timeoutMs = CARAPIS_TIMEOUT_MS, fetchImpl = fetch }: RequestOptions = {},
): Promise<CarapisListingsResponse> {
  let response: Response;
  try {
    response = await fetchImpl(buildListingsUrl(config.baseUrl, query), {
      headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: CARAPIS_REVALIDATE_SECONDS, tags: ["carapis"] },
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
    // Documented body: { error: { code, message } }. The live server was observed (2026-10-31) to answer
    // { code, detail } instead, so both are read — for logging only; provider text is never returned to clients.
    const errorBody = body as (CarapisErrorBody & { code?: unknown }) | undefined;
    const upstreamCode = errorBody?.error?.code ?? errorBody?.code;
    throw errorForStatus(response.status, typeof upstreamCode === "string" ? upstreamCode : undefined);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new CarapisError("CARAPIS_INVALID_RESPONSE", undefined, response.status);
  }
  const results = (body as CarapisListingsResponse).results;
  if (results !== undefined && !Array.isArray(results)) {
    throw new CarapisError("CARAPIS_INVALID_RESPONSE", undefined, response.status);
  }
  return body as CarapisListingsResponse;
}
