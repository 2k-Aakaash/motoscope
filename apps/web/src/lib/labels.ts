import type {
  AvailabilityStatus,
  DataProvenance,
  DataSourceType,
  PriceType,
  SpecGroup,
  VehicleCategory,
} from "@/lib/api/types";

export const categoryLabels: Record<VehicleCategory, string> = {
  Commuter: "Commuter",
  Scooter: "Scooter",
  Naked: "Naked / street",
  Sport: "Sport",
  Cruiser: "Cruiser",
  Adventure: "Adventure",
  Scrambler: "Scrambler",
  Touring: "Touring",
  Retro: "Retro / classic",
  OffRoad: "Off-road",
};

export const availabilityLabels: Record<AvailabilityStatus, string> = {
  Available: "On sale",
  Upcoming: "Upcoming",
  Discontinued: "Discontinued",
};

/** Price type is always printed next to an amount: an estimate is never an ex-showroom price. */
export const priceTypeLabels: Record<PriceType, string> = {
  ExShowroom: "Ex-showroom",
  OnRoad: "On-road",
  Estimated: "Estimate",
  Illustrative: "Illustrative demo price",
};

export const provenanceLabels: Record<DataProvenance, { label: string; description: string }> = {
  ManufacturerClaimed: {
    label: "Manufacturer claim",
    description: "Stated by the manufacturer; not independently tested.",
  },
  EditoriallyVerified: {
    label: "Verified",
    description: "Checked by the MotoScope team against a cited source.",
  },
  OwnerReported: {
    label: "Owner reported",
    description: "Reported by an owner; not independently verified.",
  },
  Estimated: { label: "Estimate", description: "Estimated by MotoScope. Not an official figure." },
  Demo: {
    label: "Demo data",
    description: "Illustrative value from the demo dataset. Not a real-world fact.",
  },
};

export const sourceTypeLabels: Record<DataSourceType, string> = {
  Manufacturer: "Manufacturer",
  Regulator: "Regulator",
  Publication: "Publication",
  Editorial: "MotoScope editorial",
  Community: "Community",
  Demo: "Demo dataset",
};

export const specGroupLabels: Record<SpecGroup, string> = {
  Engine: "Engine",
  Performance: "Performance",
  Transmission: "Transmission",
  Dimensions: "Dimensions & ergonomics",
  Brakes: "Brakes",
  Suspension: "Suspension",
  WheelsAndTyres: "Wheels & tyres",
  Features: "Electronics & features",
  Economy: "Fuel economy",
  Battery: "Battery & charging",
};

export function labelFor<K extends string>(labels: Record<K, string>, key: string): string {
  return (labels as Record<string, string>)[key] ?? key;
}
