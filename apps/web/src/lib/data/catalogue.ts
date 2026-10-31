import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import type {
  CatalogueFilters,
  ManufacturerDetail,
  ManufacturerSummary,
  MotorcycleCard,
  MotorcycleDetail,
  PagedResult,
  SitemapEntry,
} from "@/lib/api/types";
import { NotFoundError } from "@/lib/http/errors";
import * as catalogue from "@/lib/services/catalogue";
import { site } from "@/lib/site";
import { parseMotorcycleSearch } from "@/lib/validation/catalogue";

/**
 * Server Component data access. Calls the catalogue service in-process (no HTTP hop to our own API).
 * `connection()` keeps rendering at request time, so `next build` never touches the database.
 */

async function orNull<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

/** Validates the query like GET /api/v1/motorcycles (throws ValidationError for invalid filters). */
export async function searchMotorcycles(query: URLSearchParams): Promise<PagedResult<MotorcycleCard>> {
  await connection();
  return catalogue.searchMotorcycles(parseMotorcycleSearch(query));
}

export async function getCatalogueFilters(): Promise<CatalogueFilters> {
  await connection();
  return catalogue.getCatalogueFilters(site.market.code);
}

/** Deduplicated per request so generateMetadata and the page share one load. */
export const getMotorcycle = cache(async (slug: string): Promise<MotorcycleDetail | null> => {
  await connection();
  return orNull(() => catalogue.getMotorcycle(slug, site.market.code));
});

export async function listManufacturers(): Promise<ManufacturerSummary[]> {
  await connection();
  return catalogue.listManufacturers();
}

export const getManufacturer = cache(async (slug: string): Promise<ManufacturerDetail | null> => {
  await connection();
  return orNull(() => catalogue.getManufacturer(slug, site.market.code));
});

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  await connection();
  return catalogue.getSitemapEntries();
}
