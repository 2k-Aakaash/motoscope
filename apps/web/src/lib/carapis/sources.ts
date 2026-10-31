/**
 * Indian marketplace sources MotoScope is built for, with what the provider's documentation says about them
 * (docs.carapis.com/platforms, retrieved 2026-10-31). Whether a source is actually activated is decided only by the
 * account's `/sources/` response — never by this list.
 */
export interface IndianSourceInfo {
  code: string;
  name: string;
  /** As described by the provider's documentation (not verified data). */
  docsDescription: string;
}

export const indianSources: IndianSourceInfo[] = [
  { code: "bikewale", name: "BikeWale", docsDescription: "New motorcycles and scooters" },
  { code: "carwale", name: "CarWale", docsDescription: "New and used cars (dealer and private)" },
  { code: "cars24-india", name: "Cars24 India", docsDescription: "Used cars" },
];

export function sourceName(code: string | null | undefined): string {
  if (!code) return "Unknown source";
  return indianSources.find((s) => s.code === code)?.name ?? code;
}
