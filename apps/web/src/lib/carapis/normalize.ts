import type { CarapisListing } from "./types";

/**
 * A third-party marketplace listing as MotoScope exposes it. Every value comes from the provider as-is; anything the
 * provider did not send is null — never inferred. These are NOT official manufacturer specifications or prices.
 */
export interface MarketplaceVehicle {
  id: string;
  provider: "carapis";
  /** Provider platform slug (e.g. "cardekho"). */
  source: string | null;
  /** "Make Model Trim" built only from provided parts; null when neither make nor model is known. */
  name: string | null;
  make: string | null;
  model: string | null;
  /** Trim or variant name as listed. */
  variant: string | null;
  year: number | null;
  /** Seller's asking price in the listing's own currency (never converted, never assumed to be INR). */
  price: { amount: number; currency: string; type: "marketplace_asking_price" } | null;
  fuelType: string | null;
  transmission: string | null;
  /** Odometer reading as listed. The provider does not document the unit. */
  odometer: number | null;
  location: string | null;
  seller: string | null;
  images: string[];
  /** Original listing URL, for attribution. */
  sourceUrl: string | null;
  dataType: "marketplace_listing";
}

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;
const number = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const year = (value: unknown): number | null => {
  const n = number(value);
  return n !== null && Number.isInteger(n) && n >= 1885 && n <= 2100 ? n : null;
};
const httpUrl = (value: unknown): string | null => {
  const s = text(value);
  if (!s) return null;
  try {
    const url = new URL(s);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};
const currencyCode = (value: unknown): string | null => {
  const s = text(value)?.toUpperCase() ?? null;
  return s && /^[A-Z]{3}$/.test(s) ? s : null;
};

/** Normalises one listing; returns null when it lacks an identifier (it cannot be referenced or de-duplicated). */
export function normalizeListing(listing: CarapisListing): MarketplaceVehicle | null {
  const rawId = listing.id;
  const id = typeof rawId === "number" && Number.isFinite(rawId) ? String(rawId) : text(rawId);
  if (!id) return null;

  const make = text(listing.make) ?? text(listing.brand_name);
  const model = text(listing.model) ?? text(listing.model_name);
  const variant = text(listing.trim);

  // Price and currency must come as a pair from the same documented shape; a price without a currency is dropped.
  let price: MarketplaceVehicle["price"] = null;
  const primary = { amount: number(listing.price), currency: currencyCode(listing.currency) };
  const fallback = {
    amount: number(listing.price_original),
    currency: currencyCode(listing.price_original_currency),
  };
  for (const candidate of [primary, fallback]) {
    if (candidate.amount !== null && candidate.amount >= 0 && candidate.currency) {
      price = { amount: candidate.amount, currency: candidate.currency, type: "marketplace_asking_price" };
      break;
    }
  }

  const nameParts = [make, model, variant].filter((p): p is string => !!p);
  const odometer = number(listing.mileage);

  return {
    id,
    provider: "carapis",
    source: text(listing.source),
    name: make || model ? nameParts.join(" ") : null,
    make,
    model,
    variant,
    year: year(listing.year),
    price,
    fuelType: text(listing.fuel_type),
    transmission: text(listing.transmission),
    odometer: odometer !== null && odometer >= 0 ? odometer : null,
    location: text(listing.location),
    seller: text(listing.dealer),
    images: Array.isArray(listing.photos) ? listing.photos.map(httpUrl).filter((u): u is string => !!u) : [],
    sourceUrl: httpUrl(listing.url),
    dataType: "marketplace_listing",
  };
}

export function normalizeListings(listings: unknown): MarketplaceVehicle[] {
  if (!Array.isArray(listings)) return [];
  return listings
    .filter((l): l is CarapisListing => !!l && typeof l === "object")
    .map(normalizeListing)
    .filter((v): v is MarketplaceVehicle => v !== null);
}
