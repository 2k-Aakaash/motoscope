import { z } from "zod";
import { availabilityStatuses, vehicleCategories } from "@/lib/domain/catalogue/enums";
import { AbsOptions, FuelTypes, Transmissions } from "@/lib/domain/catalogue/spec-keys";
import { ciEnum, parseOrThrow, queryNumber, queryObject } from "./common";

export const catalogueSorts = [
  "name",
  "price-asc",
  "price-desc",
  "engine-asc",
  "engine-desc",
  "newest",
  "updated",
] as const;
export type CatalogueSort = (typeof catalogueSorts)[number];
export const MAX_PAGE_SIZE = 48;

const LIST_PARAMS = ["manufacturer", "category", "status", "fuel", "transmission", "abs"] as const;

const marketCode = z
  .string()
  .regex(/^[A-Za-z]{2}$/, "Market must be a two-letter country code.")
  .transform((m) => m.toUpperCase());

const between = (min: number, max: number, label: string) => (value: number | undefined) =>
  value === undefined || (value >= min && value <= max)
    ? null
    : `'${label}' must be between ${min} and ${max}. You entered ${value}.`;

const inSet = (values: readonly string[], label: string) =>
  z.array(z.string()).superRefine((items, ctx) => {
    for (const item of items) {
      if (!values.includes(item))
        ctx.addIssue({ code: "custom", message: `${label} must be one of: ${values.join(", ")}.` });
    }
  });

/**
 * GET /api/v1/motorcycles query. Multi-value filters repeat the parameter (?category=Naked&category=Adventure).
 * Rules ported from the former FluentValidation MotorcycleSearchQueryValidator.
 */
export const motorcycleSearchSchema = z
  .object({
    q: z.string().max(100, "'Text' must be 100 characters or fewer.").optional(),
    manufacturer: z.array(z.string().max(120)).max(20, "Too many manufacturers.").default([]),
    category: z.array(ciEnum(vehicleCategories)).default([]),
    status: z.array(ciEnum(availabilityStatuses)).default([]),
    fuel: inSet(FuelTypes, "Fuel type").default([]),
    transmission: inSet(Transmissions, "Transmission").default([]),
    abs: inSet(AbsOptions, "ABS").default([]),
    minPrice: queryNumber(),
    maxPrice: queryNumber(),
    minCc: queryNumber(true),
    maxCc: queryNumber(true),
    maxSeatHeight: queryNumber(true),
    maxWeight: queryNumber(true),
    yearFrom: queryNumber(true),
    yearTo: queryNumber(true),
    sort: z
      .string()
      .optional()
      .refine((s) => s === undefined || (catalogueSorts as readonly string[]).includes(s), {
        message: `Sort must be one of: ${catalogueSorts.join(", ")}.`,
      })
      .transform((s) => s as CatalogueSort | undefined),
    market: marketCode.default("IN"),
    page: queryNumber(true).transform((p) => p ?? 1),
    pageSize: queryNumber(true).transform((p) => p ?? 24),
  })
  .superRefine((q, ctx) => {
    const check = (path: string, message: string | null) => {
      if (message) ctx.addIssue({ code: "custom", path: [path], message });
    };
    check("page", between(1, 10_000, "Page")(q.page));
    check("pageSize", between(1, MAX_PAGE_SIZE, "Page Size")(q.pageSize));
    check(
      "minPrice",
      q.minPrice !== undefined && q.minPrice < 0 ? "'Min Price' must be greater than or equal to '0'." : null,
    );
    check(
      "maxPrice",
      q.maxPrice !== undefined && q.maxPrice < (q.minPrice ?? 0)
        ? "Maximum price must not be below the minimum price."
        : null,
    );
    check("minCc", between(0, 3000, "Min Cc")(q.minCc));
    check(
      "maxCc",
      between(0, 3000, "Max Cc")(q.maxCc) ??
        (q.maxCc !== undefined && q.maxCc < (q.minCc ?? 0)
          ? "Maximum engine capacity must not be below the minimum."
          : null),
    );
    check("maxSeatHeight", between(500, 1200, "Max Seat Height Mm")(q.maxSeatHeight));
    check("maxWeight", between(50, 500, "Max Kerb Weight Kg")(q.maxWeight));
    check("yearFrom", between(1900, 2100, "Launch Year From")(q.yearFrom));
    check(
      "yearTo",
      between(1900, 2100, "Launch Year To")(q.yearTo) ??
        (q.yearTo !== undefined && q.yearTo < (q.yearFrom ?? 1900)
          ? "'Year to' must not be before 'Year from'."
          : null),
    );
  });

export type MotorcycleSearch = z.output<typeof motorcycleSearchSchema>;

export function parseMotorcycleSearch(params: URLSearchParams): MotorcycleSearch {
  return parseOrThrow(motorcycleSearchSchema, queryObject(params, LIST_PARAMS), { keyByParameter: true });
}

export function parseMarket(params: URLSearchParams): string {
  return parseOrThrow(z.object({ market: marketCode.default("IN") }), {
    market: params.get("market") ?? undefined,
  }).market;
}
