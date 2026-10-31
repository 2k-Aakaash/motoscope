import { CarapisError } from "@/lib/carapis/errors";
import { ValidationError } from "@/lib/http/errors";
import { logger } from "@/lib/logging/logger";

/**
 * Response envelope for /api/v1/vehicles* and /api/v1/integration/*:
 *   success: { success: true, ... }   error: { success: false, error: { code, message, details? } }
 * (Catalogue endpoints keep RFC 9457 Problem Details.)
 */
export function vehicleJson(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify({ success: status < 400, ...body }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

export function vehicleError(code: string, message: string, status: number, details?: unknown): Response {
  return vehicleJson({ error: { code, message, ...(details ? { details } : {}) } }, status);
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
