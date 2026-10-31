// Catalogue enums. Stored in PostgreSQL as their string names (varchar), so the order of members is safe to change.
// Array order is the canonical sort order (it mirrors the original C# enum declaration order).

export const vehicleCategories = [
  "Commuter",
  "Scooter",
  "Naked",
  "Sport",
  "Cruiser",
  "Adventure",
  "Scrambler",
  "Touring",
  "Retro",
  "OffRoad",
] as const;
export type VehicleCategory = (typeof vehicleCategories)[number];

export const availabilityStatuses = ["Available", "Upcoming", "Discontinued"] as const;
export type AvailabilityStatus = (typeof availabilityStatuses)[number];

export const publicationStatuses = ["Draft", "Published", "Archived"] as const;
export type PublicationStatus = (typeof publicationStatuses)[number];

export const dataProvenances = [
  "ManufacturerClaimed",
  "EditoriallyVerified",
  "OwnerReported",
  "Estimated",
  "Demo",
] as const;
export type DataProvenance = (typeof dataProvenances)[number];

export const priceTypes = ["ExShowroom", "OnRoad", "Estimated", "Illustrative"] as const;
export type PriceType = (typeof priceTypes)[number];

export const dataSourceTypes = [
  "Manufacturer",
  "Regulator",
  "Publication",
  "Editorial",
  "Community",
  "Demo",
] as const;
export type DataSourceType = (typeof dataSourceTypes)[number];

export const specValueTypes = ["Number", "Integer", "Text", "Boolean", "Enum"] as const;
export type SpecValueType = (typeof specValueTypes)[number];

export const specGroups = [
  "Engine",
  "Performance",
  "Transmission",
  "Dimensions",
  "Brakes",
  "Suspension",
  "WheelsAndTyres",
  "Features",
  "Economy",
  "Battery",
] as const;
export type SpecGroup = (typeof specGroups)[number];

/** Index of a value in its canonical order, for sorting like the original enum ordering. */
export function enumOrder<T extends string>(values: readonly T[], value: T): number {
  return values.indexOf(value);
}
