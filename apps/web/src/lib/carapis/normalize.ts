import type { CarapisPhoto, CarapisVehicle, CarapisVehicleDetail } from "./types";

/**
 * MotoScope's normalised view of a third-party marketplace listing. Values are copied only when the provider sent
 * them with the right type; everything else is null. Nothing is inferred except `vehicleType` from an explicit body type.
 * These are NOT official manufacturer specifications or ex-showroom/on-road prices.
 */
export interface Vehicle {
  id: string;
  source: string | null;
  /** Listing id on the source marketplace (detail view only). */
  listingId: string | null;

  manufacturer: string | null;
  model: string | null;
  variant: string | null;
  year: number | null;

  vehicleType: "car" | "motorcycle" | "scooter" | "unknown";

  price: {
    /** Asking price in `currency` (the listing's own currency; never converted). */
    amount: number | null;
    currency: string | null;
    /** The provider's original string, e.g. "19500000.00". */
    originalAmount: string | null;
    priceType: "listing" | "unknown";
  };

  specifications: {
    engineCc: number | null;
    fuelType: string | null;
    transmission: string | null;
    bodyType: string | null;
    /** Odometer reading as listed; the provider does not state the unit. */
    mileage: number | null;
    seatCount: number | null;
  };

  location: {
    /** Not provided by Carapis; always null. */
    city: string | null;
    /** Not provided by Carapis; always null. */
    state: string | null;
    region: string | null;
    countryCode: string | null;
  };

  images: string[];
  /** Original listing URL (detail view only; the list view has none). */
  listingUrl: string | null;
  sellerType: string | null;
  isNewVehicle: boolean | null;
  isAvailable: boolean | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  dataType: "marketplace_listing";
}

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const bool = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);
const nonNegative = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && n >= 0 ? n : null;
};
const year = (v: unknown): number | null => {
  const n = num(v);
  return n !== null && Number.isInteger(n) && n >= 1885 && n <= 2100 ? n : null;
};
const httpUrl = (v: unknown): string | null => {
  const s = text(v);
  if (!s) return null;
  try {
    const url = new URL(s);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};
const isoDate = (v: unknown): string | null => {
  const s = text(v);
  return s && !Number.isNaN(Date.parse(s)) ? s : null;
};

/** Explicit body types only; a source name alone (e.g. BikeWale) does not tell motorcycle from scooter. */
const CAR_BODY_TYPES = new Set([
  "sedan",
  "hatchback",
  "suv",
  "crossover",
  "coupe",
  "convertible",
  "wagon",
  "estate",
  "minivan",
  "mpv",
  "van",
  "pickup",
  "truck",
]);
export function vehicleTypeFrom(bodyType: string | null): Vehicle["vehicleType"] {
  if (!bodyType) return "unknown";
  const b = bodyType.toLowerCase();
  if (b === "motorcycle" || b === "motorbike" || b === "bike") return "motorcycle";
  if (b === "scooter") return "scooter";
  return CAR_BODY_TYPES.has(b) ? "car" : "unknown";
}

function price(raw: CarapisVehicle): Vehicle["price"] {
  const original = raw.price_original;
  const originalAmount = typeof original === "number" ? String(original) : text(original);
  const amount =
    originalAmount !== null && /^\d+(\.\d+)?$/.test(originalAmount) ? Number(originalAmount) : null;
  const currencyText = text(raw.price_original_currency)?.toUpperCase() ?? null;
  const currency = currencyText && /^[A-Z]{3}$/.test(currencyText) ? currencyText : null;
  // A positive amount with its own currency is a listing price; anything else is reported as unknown.
  // `price_usd` (a provider conversion) is never used.
  const valid = amount !== null && amount > 0 && currency !== null;
  return {
    amount: valid ? amount : null,
    currency: valid ? currency : null,
    originalAmount,
    priceType: valid ? "listing" : "unknown",
  };
}

function images(raw: CarapisVehicle): string[] {
  const photos: CarapisPhoto[] = Array.isArray(raw.photos) ? raw.photos : [];
  const urls = photos
    .filter((p): p is CarapisPhoto => !!p && typeof p === "object")
    .map((p) => httpUrl(p.url) ?? httpUrl(p.original_url))
    .filter((u): u is string => !!u);
  if (urls.length === 0) {
    const thumb =
      raw.thumb && typeof raw.thumb === "object"
        ? (httpUrl(raw.thumb.url) ?? httpUrl(raw.thumb.thumb_url))
        : null;
    if (thumb) urls.push(thumb);
  }
  return [...new Set(urls)];
}

/** Normalises a list or detail record; returns null without an id. */
export function normalizeVehicle(raw: CarapisVehicle | CarapisVehicleDetail): Vehicle | null {
  const id = text(raw.id);
  if (!id) return null;
  const detail = raw as CarapisVehicleDetail;
  const bodyType = text(raw.body_type);
  const location =
    raw.source_location && typeof raw.source_location === "object" ? raw.source_location : undefined;
  const countryText = text(location?.iso2)?.toUpperCase() ?? null;

  return {
    id,
    source: text(raw.source_code),
    listingId: text(detail.listing_id),
    manufacturer: text(raw.brand_name),
    model: text(raw.model_name),
    variant: text(raw.trim),
    year: year(raw.year),
    vehicleType: vehicleTypeFrom(bodyType),
    price: price(raw),
    specifications: {
      engineCc: nonNegative(detail.engine_cc),
      fuelType: text(raw.fuel_type),
      transmission: text(raw.transmission),
      bodyType,
      mileage: nonNegative(raw.mileage),
      seatCount: nonNegative(detail.seat_count),
    },
    location: {
      city: null,
      state: null,
      region: text(raw.region) ?? text(location?.region_text),
      countryCode: countryText && /^[A-Z]{2}$/.test(countryText) ? countryText : null,
    },
    images: images(raw),
    listingUrl: httpUrl(detail.listing_url),
    sellerType: text(raw.seller_type),
    isNewVehicle: bool(raw.is_new_vehicle),
    isAvailable: bool(raw.is_available),
    firstSeenAt: isoDate(raw.first_seen_at),
    lastSeenAt: isoDate(raw.last_seen_at),
    dataType: "marketplace_listing",
  };
}

export function normalizeVehicles(list: unknown): Vehicle[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((v): v is CarapisVehicle => !!v && typeof v === "object")
    .map(normalizeVehicle)
    .filter((v): v is Vehicle => v !== null);
}
