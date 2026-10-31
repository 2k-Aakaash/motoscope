import { availabilityLabels, categoryLabels, labelFor } from "@/lib/labels";
import { formatInrCompact } from "@/lib/format";

/**
 * Catalogue URL state. The public URL uses the same parameter names as the API
 * (/motorcycles?category=Naked&maxPrice=300000&sort=price-asc), so filtered views are shareable.
 */
export interface CatalogueParams {
  q: string | null;
  manufacturer: string[];
  category: string[];
  status: string[];
  fuel: string[];
  transmission: string[];
  abs: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minCc: number | null;
  maxCc: number | null;
  maxSeatHeight: number | null;
  maxWeight: number | null;
  yearFrom: number | null;
  yearTo: number | null;
  sort: SortKey;
  page: number;
}

export const PAGE_SIZE = 24;

export const sortOptions = [
  { value: "name", label: "Name (A–Z)" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "engine-asc", label: "Engine: smallest first" },
  { value: "engine-desc", label: "Engine: largest first" },
  { value: "newest", label: "Newest models" },
  { value: "updated", label: "Recently updated" },
] as const;

export type SortKey = (typeof sortOptions)[number]["value"];
const DEFAULT_SORT: SortKey = "name";

const LIST_KEYS = ["manufacturer", "category", "status", "fuel", "transmission", "abs"] as const;
const NUMBER_KEYS = [
  "minPrice",
  "maxPrice",
  "minCc",
  "maxCc",
  "maxSeatHeight",
  "maxWeight",
  "yearFrom",
  "yearTo",
] as const;

type RawParams = Record<string, string | string[] | undefined>;

function asList(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [
    ...new Set(
      values
        .flatMap((v) => v.split(","))
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ].slice(0, 20);
}

function asNumber(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw?.trim()) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Normalises untrusted search params: unknown keys dropped, invalid numbers ignored, lists de-duplicated. */
export function parseCatalogueParams(raw: RawParams): CatalogueParams {
  const q = (Array.isArray(raw.q) ? raw.q[0] : raw.q)?.trim().slice(0, 100) || null;
  const sortRaw = Array.isArray(raw.sort) ? raw.sort[0] : raw.sort;
  const sort = sortOptions.some((o) => o.value === sortRaw) ? (sortRaw as SortKey) : DEFAULT_SORT;
  const page = Math.max(1, Math.min(10_000, Math.floor(asNumber(raw.page) ?? 1)));

  const params = { q, sort, page } as CatalogueParams;
  for (const key of LIST_KEYS) params[key] = asList(raw[key]);
  for (const key of NUMBER_KEYS) params[key] = asNumber(raw[key]);
  return params;
}

/** Serialises params for the public URL (defaults omitted) — also accepted by the API as-is. */
export function toSearchParams(params: CatalogueParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  for (const key of LIST_KEYS) for (const value of params[key]) sp.append(key, value);
  for (const key of NUMBER_KEYS) if (params[key] !== null) sp.set(key, String(params[key]));
  if (params.sort !== DEFAULT_SORT) sp.set("sort", params.sort);
  if (params.page > 1) sp.set("page", String(params.page));
  return sp;
}

export function toApiQuery(params: CatalogueParams): URLSearchParams {
  const sp = toSearchParams(params);
  sp.set("pageSize", String(PAGE_SIZE));
  return sp;
}

export function catalogueHref(params: CatalogueParams, overrides: Partial<CatalogueParams> = {}): string {
  const qs = toSearchParams({ ...params, ...overrides }).toString();
  return qs ? `/motorcycles?${qs}` : "/motorcycles";
}

export function activeFilterCount(params: CatalogueParams): number {
  return (
    (params.q ? 1 : 0) +
    LIST_KEYS.reduce((n, key) => n + params[key].length, 0) +
    NUMBER_KEYS.reduce((n, key) => n + (params[key] !== null ? 1 : 0), 0)
  );
}

/**
 * Only the unfiltered catalogue and single-facet manufacturer/category landing views are worth indexing.
 * Other filter combinations are thin/duplicate content: rendered with noindex,follow and canonicalised.
 */
export function isIndexable(params: CatalogueParams): boolean {
  if (params.sort !== DEFAULT_SORT) return false;
  const count = activeFilterCount(params);
  if (count === 0) return true;
  return count === 1 && (params.manufacturer.length === 1 || params.category.length === 1);
}

/** Canonical URL path for a catalogue view (pagination of indexable views keeps its page). */
export function canonicalPath(params: CatalogueParams): string {
  if (!isIndexable(params)) return "/motorcycles";
  return catalogueHref(params);
}

export interface FilterChip {
  label: string;
  removeHref: string;
}

/** Describes each active filter with a link that removes just that filter (and resets to page 1). */
export function filterChips(
  params: CatalogueParams,
  manufacturerNames: Record<string, string> = {},
): FilterChip[] {
  const base = { ...params, page: 1 };
  const chips: FilterChip[] = [];
  const without = (key: (typeof LIST_KEYS)[number], value: string) =>
    catalogueHref(base, { [key]: params[key].filter((v) => v !== value) });

  if (params.q) chips.push({ label: `“${params.q}”`, removeHref: catalogueHref(base, { q: null }) });
  for (const v of params.manufacturer)
    chips.push({ label: manufacturerNames[v] ?? v, removeHref: without("manufacturer", v) });
  for (const v of params.category)
    chips.push({ label: labelFor(categoryLabels, v), removeHref: without("category", v) });
  for (const v of params.status)
    chips.push({ label: labelFor(availabilityLabels, v), removeHref: without("status", v) });
  for (const key of ["fuel", "transmission", "abs"] as const)
    for (const v of params[key])
      chips.push({ label: key === "abs" ? `ABS: ${v}` : v, removeHref: without(key, v) });

  const range = (
    min: number | null,
    max: number | null,
    fmt: (n: number) => string,
    name: string,
    clear: Partial<CatalogueParams>,
  ) => {
    if (min === null && max === null) return;
    const label =
      min !== null && max !== null
        ? `${name}: ${fmt(min)}–${fmt(max)}`
        : min !== null
          ? `${name}: from ${fmt(min)}`
          : `${name}: up to ${fmt(max!)}`;
    chips.push({ label, removeHref: catalogueHref(base, clear) });
  };
  range(params.minPrice, params.maxPrice, formatInrCompact, "Price", { minPrice: null, maxPrice: null });
  range(params.minCc, params.maxCc, (n) => `${n} cc`, "Engine", { minCc: null, maxCc: null });
  range(null, params.maxSeatHeight, (n) => `${n} mm`, "Seat height", { maxSeatHeight: null });
  range(null, params.maxWeight, (n) => `${n} kg`, "Kerb weight", { maxWeight: null });
  range(params.yearFrom, params.yearTo, String, "Launch year", { yearFrom: null, yearTo: null });
  return chips;
}
