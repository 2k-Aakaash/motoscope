/**
 * Carapis response types, taken from the official documentation (docs.carapis.com, retrieved 2026-10-31).
 * Not yet verified against a live response (no API key available). Every field is optional and `unknown`-tolerant
 * at runtime: normalize.ts validates each value before use.
 *
 * Two shapes are documented and they disagree:
 * - `GET /v2/listings` (Getting started, Listings, JavaScript client): `make`, `model`, `price`, `currency`, …
 * - Platform pages (`/apix/api/vehicles/`): `brand_name`, `model_name`, `price_original`, `price_original_currency`, …
 * This integration calls `/v2/listings` and only reads the second shape's field names as a fallback.
 */

/** A listing as documented for `GET /v2/listings`. */
export interface CarapisListing {
  id?: string | number;
  source?: string;
  make?: string;
  model?: string;
  trim?: string;
  year?: number;
  /** Odometer reading. The documentation does not state the unit. */
  mileage?: number;
  /** Listed price in `currency` (marketplace asking price, not an official price). */
  price?: number;
  /** ISO 4217 code, e.g. KRW, EUR. */
  currency?: string;
  location?: string;
  fuel_type?: string;
  transmission?: string;
  photos?: string[];
  dealer?: string;
  /** Canonical URL of the original listing. */
  url?: string;
  // Fallback names documented on platform pages (`/apix` schema).
  brand_name?: string;
  model_name?: string;
  price_original?: number;
  price_original_currency?: string;
  last_seen_at?: string;
}

/** Envelope documented for `GET /v2/listings`. */
export interface CarapisListingsResponse {
  count?: number;
  page?: number;
  limit?: number;
  results?: CarapisListing[];
}

/** Documented error body: `{ "error": { "code": "...", "message": "..." } }`. */
export interface CarapisErrorBody {
  error?: { code?: string; message?: string };
}

/** Query parameters documented for `GET /v2/listings`. `source` is required. */
export interface CarapisListingsQuery {
  source: string;
  make?: string;
  model?: string;
  year_min?: number;
  year_max?: number;
  price_min?: number;
  price_max?: number;
  limit?: number;
  page?: number;
}
