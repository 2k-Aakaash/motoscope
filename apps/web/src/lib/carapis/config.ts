import "server-only";

export const CARAPIS_DEFAULT_BASE_URL = "https://api.carapis.com/v2";

export interface CarapisConfig {
  apiKey: string;
  baseUrl: string;
}

/**
 * Server-side Carapis configuration. The key is read from CARAPIS_API_KEY only (never a NEXT_PUBLIC_ variable),
 * so it is never inlined into browser bundles. Returns null when no key is configured.
 */
export function readCarapisConfig(env: NodeJS.ProcessEnv = process.env): CarapisConfig | null {
  const apiKey = env.CARAPIS_API_KEY?.trim();
  if (!apiKey) return null;
  return { apiKey, baseUrl: normaliseBaseUrl(env.CARAPIS_BASE_URL) };
}

/** Base URL without a trailing slash; only https is accepted, so the key is never sent in clear text. */
export function normaliseBaseUrl(raw: string | undefined): string {
  const value = (raw?.trim() || CARAPIS_DEFAULT_BASE_URL).replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("CARAPIS_BASE_URL is not a valid URL.");
  }
  if (url.protocol !== "https:") throw new Error("CARAPIS_BASE_URL must use https.");
  return value;
}

export function isCarapisConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!env.CARAPIS_API_KEY?.trim();
}
