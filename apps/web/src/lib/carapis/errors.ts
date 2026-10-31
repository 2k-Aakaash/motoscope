export type CarapisErrorCode =
  | "CARAPIS_NOT_CONFIGURED"
  | "CARAPIS_INVALID_REQUEST"
  | "CARAPIS_UNAUTHORIZED"
  | "CARAPIS_FORBIDDEN"
  | "CARAPIS_NOT_FOUND"
  | "CARAPIS_RATE_LIMITED"
  | "CARAPIS_TIMEOUT"
  | "CARAPIS_UNAVAILABLE"
  | "CARAPIS_INVALID_RESPONSE";

/** HTTP status MotoScope returns to its own clients, and a safe message (never the provider's raw text or the key). */
const definitions: Record<CarapisErrorCode, { status: number; message: string }> = {
  CARAPIS_NOT_CONFIGURED: { status: 503, message: "The vehicle data provider is not configured." },
  CARAPIS_INVALID_REQUEST: {
    status: 400,
    message: "The vehicle data provider rejected the request parameters.",
  },
  CARAPIS_UNAUTHORIZED: { status: 401, message: "The vehicle data provider rejected our credentials." },
  CARAPIS_FORBIDDEN: { status: 403, message: "Our provider plan does not include this data source." },
  CARAPIS_NOT_FOUND: { status: 404, message: "The vehicle data provider could not find this resource." },
  CARAPIS_RATE_LIMITED: { status: 429, message: "Vehicle data provider rate limit reached." },
  CARAPIS_TIMEOUT: { status: 503, message: "The vehicle data provider did not respond in time." },
  CARAPIS_UNAVAILABLE: { status: 503, message: "The vehicle data provider is currently unavailable." },
  CARAPIS_INVALID_RESPONSE: {
    status: 502,
    message: "The vehicle data provider returned an invalid response.",
  },
};

export class CarapisError extends Error {
  readonly status: number;

  constructor(
    readonly code: CarapisErrorCode,
    /** Provider error code (e.g. `rate_limit_exceeded`), for logs only. */
    readonly upstreamCode?: string,
    readonly upstreamStatus?: number,
  ) {
    super(definitions[code].message);
    this.name = "CarapisError";
    this.status = definitions[code].status;
  }
}

/** Maps a documented Carapis HTTP status to a MotoScope error. */
export function errorForStatus(status: number, upstreamCode?: string): CarapisError {
  if (status === 400 || status === 422)
    return new CarapisError("CARAPIS_INVALID_REQUEST", upstreamCode, status);
  if (status === 401) return new CarapisError("CARAPIS_UNAUTHORIZED", upstreamCode, status);
  if (status === 403) return new CarapisError("CARAPIS_FORBIDDEN", upstreamCode, status);
  if (status === 404) return new CarapisError("CARAPIS_NOT_FOUND", upstreamCode, status);
  if (status === 429) return new CarapisError("CARAPIS_RATE_LIMITED", upstreamCode, status);
  if (status >= 500) return new CarapisError("CARAPIS_UNAVAILABLE", upstreamCode, status);
  return new CarapisError("CARAPIS_INVALID_RESPONSE", upstreamCode, status);
}
