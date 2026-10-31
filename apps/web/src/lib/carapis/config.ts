import "server-only";

/**
 * Verified 2026-10-31 with a real key: the provider serves `https://api.carapis.com/apix/api/{vehicles,sources,…}`.
 * The `/v2/listings` URL shown in the getting-started docs returns 404 (also when authenticated).
 */
export const CARAPIS_DEFAULT_BASE_URL = "https://api.carapis.com/apix/api";

/** Sources MotoScope serves when activated on the account (India-first product decision). */
export const DEFAULT_VEHICLE_SOURCES = ["bikewale", "carwale", "cars24-india"];

export interface CarapisConfig {
  apiKey: string;
  baseUrl: string;
}

export class CarapisConfigError extends Error {}

/**
 * Server-side configuration. The key is read from CARAPIS_API_KEY only (never NEXT_PUBLIC_), so it is never inlined
 * into browser bundles. Returns null when no key is configured; throws CarapisConfigError for an unusable base URL.
 */
export function readCarapisConfig(env: NodeJS.ProcessEnv = process.env): CarapisConfig | null {
  const apiKey = env.CARAPIS_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey, baseUrl: normaliseBaseUrl(env.CARAPIS_BASE_URL) };
}

/** Base URL without a trailing slash. Only https is accepted, and the known-dead `/v2` base is rejected with guidance. */
export function normaliseBaseUrl(raw: string | undefined): string {
  const value = (raw?.trim() || CARAPIS_DEFAULT_BASE_URL).replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CarapisConfigError("CARAPIS_BASE_URL is not a valid URL.");
  }
  if (url.protocol !== "https:") throw new CarapisConfigError("CARAPIS_BASE_URL must use https.");
  if (/\/v2$/.test(url.pathname)) {
    throw new CarapisConfigError(
      `CARAPIS_BASE_URL ends in /v2, which the provider does not serve (verified 404). Use ${CARAPIS_DEFAULT_BASE_URL}.`,
    );
  }
  return value;
}

export function isCarapisConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.CARAPIS_API_KEY?.trim();
}

/** Source codes MotoScope is allowed to serve (MOTOSCOPE_VEHICLE_SOURCES, comma-separated), default the Indian three. */
export function enabledVehicleSources(env: NodeJS.ProcessEnv = process.env): string[] {
  const raw = env.MOTOSCOPE_VEHICLE_SOURCES?.trim();
  const list = raw
    ? raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    : DEFAULT_VEHICLE_SOURCES;
  return [...new Set(list)];
}
