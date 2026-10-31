import { CarapisError } from "@/lib/carapis/errors";
import { ValidationError } from "@/lib/http/errors";
import { logger } from "@/lib/logging/logger";
import type { VehicleListResult } from "./service";

/**
 * Response envelope for the /api/v1/vehicles* and /api/v1/integration/* endpoints:
 *   { success: true, provider, data, pagination, meta } | { success: false, error: { code, message, details? } }
 * (The catalogue endpoints keep RFC 9457 Problem Details.)
 */
function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function vehicleSuccess(result: VehicleListResult): Response {
  return json({ success: true, provider: "carapis", ...result }, 200);
}

export function vehicleError(code: string, message: string, status: number, details?: unknown): Response {
  return json({ success: false, error: { code, message, ...(details ? { details } : {}) } }, status);
}

/** Maps any error to the envelope. Unknown errors become a generic 500 (logged server-side, never echoed). */
export function vehicleErrorFrom(error: unknown, correlationId?: string): Response {
  if (error instanceof ValidationError) {
    return vehicleError("INVALID_PARAMETERS", "One or more query parameters are invalid.", 400, error.errors);
  }
  if (error instanceof CarapisError) return vehicleError(error.code, error.message, error.status);
  logger.error("Vehicle endpoint failed", { correlationId }, error);
  return vehicleError("INTERNAL_ERROR", "An unexpected error occurred.", 500);
}
