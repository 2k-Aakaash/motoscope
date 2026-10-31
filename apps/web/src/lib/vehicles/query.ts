import { z } from "zod";
import type { CarapisListingsQuery } from "@/lib/carapis/types";
import { parseOrThrow, queryNumber } from "@/lib/validation/common";

export const VEHICLES_MAX_LIMIT = 50;
export const VEHICLES_DEFAULT_LIMIT = 20;
/** The provider documents results "up to position 10,000 in any query". */
const MAX_POSITION = 10_000;

const optionalText = (label: string) =>
  z
    .string()
    .trim()
    .max(60, `'${label}' must be 60 characters or fewer.`)
    .optional()
    .transform((v) => (v ? v : undefined));

/** Parameters documented for Carapis `GET /listings`. `source` is required by the provider. */
export const vehiclesQuerySchema = z
  .object({
    source: z
      .string({ error: "'source' is required (a provider platform slug)." })
      .trim()
      .min(1, "'source' is required (a provider platform slug).")
      .max(60)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "'source' must be a lowercase platform slug, e.g. 'cardekho'."),
    make: optionalText("make"),
    model: optionalText("model"),
    year_min: queryNumber(true),
    year_max: queryNumber(true),
    price_min: queryNumber(true),
    price_max: queryNumber(true),
    limit: queryNumber(true).transform((v) => v ?? VEHICLES_DEFAULT_LIMIT),
    page: queryNumber(true).transform((v) => v ?? 1),
  })
  .superRefine((q, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: "custom", path: [path], message });
    for (const key of ["year_min", "year_max"] as const) {
      const v = q[key];
      if (v !== undefined && (v < 1900 || v > 2100)) issue(key, `'${key}' must be between 1900 and 2100.`);
    }
    for (const key of ["price_min", "price_max"] as const) {
      const v = q[key];
      if (v !== undefined && v < 0) issue(key, `'${key}' must not be negative.`);
    }
    if (q.year_min !== undefined && q.year_max !== undefined && q.year_max < q.year_min)
      issue("year_max", "'year_max' must not be below 'year_min'.");
    if (q.price_min !== undefined && q.price_max !== undefined && q.price_max < q.price_min)
      issue("price_max", "'price_max' must not be below 'price_min'.");
    if (q.limit < 1 || q.limit > VEHICLES_MAX_LIMIT)
      issue("limit", `'limit' must be between 1 and ${VEHICLES_MAX_LIMIT}.`);
    if (q.page < 1) issue("page", "'page' must be 1 or greater.");
    else if (q.page * q.limit > MAX_POSITION)
      issue("page", `The provider returns results only up to position ${MAX_POSITION}.`);
  });

const KNOWN_PARAMS = [
  "source",
  "make",
  "model",
  "year_min",
  "year_max",
  "price_min",
  "price_max",
  "limit",
  "page",
];

export function parseVehiclesQuery(params: URLSearchParams): CarapisListingsQuery {
  const raw: Record<string, string> = {};
  for (const key of KNOWN_PARAMS) {
    const value = params.get(key);
    if (value !== null) raw[key] = value;
  }
  return parseOrThrow(vehiclesQuerySchema, raw, { keyByParameter: true });
}

/** Search requires at least one documented filter besides `source` (the provider has no free-text search). */
export function hasSearchFilter(query: CarapisListingsQuery): boolean {
  return [query.make, query.model, query.year_min, query.year_max, query.price_min, query.price_max].some(
    (v) => v !== undefined,
  );
}
