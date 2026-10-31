import { z } from "zod";
import type { CarapisVehicleQuery } from "@/lib/carapis/types";
import { slugify } from "@/lib/utils/text";
import { parseOrThrow, queryNumber } from "@/lib/validation/common";

export const VEHICLES_MAX_LIMIT = 50;
export const VEHICLES_DEFAULT_LIMIT = 20;

/** Source codes as returned by the provider, e.g. `cars24-india`, `ikman_lk`. */
const SOURCE_CODE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const TOKEN = /^[a-z0-9]+(?:[-_ ][a-z0-9]+)*$/i;

const optionalText = (label: string, max = 60) =>
  z
    .string()
    .trim()
    .max(max, `'${label}' must be ${max} characters or fewer.`)
    .optional()
    .transform((v) => (v ? v : undefined));
const optionalToken = (label: string) =>
  optionalText(label, 30).refine((v) => v === undefined || TOKEN.test(v), `'${label}' has an invalid value.`);
const optionalBoolean = (label: string) =>
  z
    .enum(["true", "false"], `'${label}' must be true or false.`)
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true"));

/**
 * MotoScope query parameters for /api/v1/vehicles (names kept stable for existing callers), mapped onto the
 * parameters the Carapis `/vehicles/` endpoint actually accepts (verified 2026-10-31).
 */
const schema = z
  .object({
    source: z
      .string({ error: "'source' is required." })
      .trim()
      .toLowerCase()
      .min(1, "'source' is required.")
      .max(60)
      .regex(SOURCE_CODE, "'source' must be a provider source code, e.g. 'bikewale'."),
    manufacturer: optionalText("manufacturer"),
    make: optionalText("make"),
    model: optionalText("model"),
    q: optionalText("q", 100),
    year_min: queryNumber(true),
    year_max: queryNumber(true),
    price_min: queryNumber(),
    price_max: queryNumber(),
    currency: optionalText("currency", 3),
    engine_cc_min: queryNumber(true),
    engine_cc_max: queryNumber(true),
    fuel_type: optionalToken("fuel_type"),
    transmission: optionalToken("transmission"),
    body_type: optionalToken("body_type"),
    is_new: optionalBoolean("is_new"),
    available_only: optionalBoolean("available_only"),
    limit: queryNumber(true).transform((v) => v ?? VEHICLES_DEFAULT_LIMIT),
    page: queryNumber(true).transform((v) => v ?? 1),
  })
  .superRefine((q, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    const range = (
      min: number | undefined,
      max: number | undefined,
      lo: number,
      hi: number,
      name: string,
    ) => {
      for (const [key, v] of [
        [`${name}_min`, min],
        [`${name}_max`, max],
      ] as const)
        if (v !== undefined && (v < lo || v > hi)) issue(key, `'${key}' must be between ${lo} and ${hi}.`);
      if (min !== undefined && max !== undefined && max < min)
        issue(`${name}_max`, `'${name}_max' must not be below '${name}_min'.`);
    };
    range(q.year_min, q.year_max, 1900, 2100, "year");
    range(q.price_min, q.price_max, 0, 1e12, "price");
    range(q.engine_cc_min, q.engine_cc_max, 0, 10_000, "engine_cc");
    // The provider filters prices on its USD conversion unless a currency is given; MotoScope never filters silently
    // in USD, so price filters require the listing currency explicitly.
    if ((q.price_min !== undefined || q.price_max !== undefined) && !q.currency)
      issue("currency", "'currency' (ISO 4217, e.g. INR) is required with price filters.");
    if (q.currency && !/^[A-Za-z]{3}$/.test(q.currency))
      issue("currency", "'currency' must be an ISO 4217 code.");
    if (q.manufacturer && q.make && slugify(q.manufacturer) !== slugify(q.make))
      issue("manufacturer", "Use either 'manufacturer' or 'make', not both.");
    if (q.limit < 1 || q.limit > VEHICLES_MAX_LIMIT)
      issue("limit", `'limit' must be between 1 and ${VEHICLES_MAX_LIMIT}.`);
    if (q.page < 1 || q.page > 10_000) issue("page", "'page' must be between 1 and 10000.");
  });

const KNOWN = Object.keys(schema.shape);

export function parseVehiclesQuery(params: URLSearchParams): CarapisVehicleQuery {
  const raw: Record<string, string> = {};
  for (const key of KNOWN) {
    const value = params.get(key);
    if (value !== null) raw[key] = value;
  }
  const q = parseOrThrow(schema, raw, { keyByParameter: true });
  const manufacturer = q.manufacturer ?? q.make;
  return {
    source: q.source,
    // The provider's `brand` filter takes slugs (verified: brand=hyundai).
    brand: manufacturer ? slugify(manufacturer) : undefined,
    model: q.model ? slugify(q.model) : undefined,
    search: q.q,
    min_year: q.year_min,
    max_year: q.year_max,
    min_price: q.price_min,
    max_price: q.price_max,
    price_currency: q.currency?.toUpperCase(),
    min_engine_cc: q.engine_cc_min,
    max_engine_cc: q.engine_cc_max,
    fuel_type: q.fuel_type?.toLowerCase(),
    transmission: q.transmission?.toLowerCase(),
    body_type: q.body_type?.toLowerCase(),
    is_new_vehicle: q.is_new,
    available_only: q.available_only,
    page: q.page,
    page_size: q.limit,
  };
}

/** True when any filter besides `source`/paging is set (used by /search, which needs something to search for). */
export function hasSearchFilter(q: CarapisVehicleQuery): boolean {
  const notFilters = new Set(["source", "page", "page_size"]);
  return Object.entries(q).some(([key, value]) => !notFilters.has(key) && value !== undefined);
}

export const vehicleIdSchema = z.uuid();
