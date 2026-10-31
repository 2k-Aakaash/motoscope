// API contract (DTOs) returned by the /api/v1 Route Handlers and the catalogue service.
// Shapes are unchanged from the former ASP.NET Core API (see docs/API_MIGRATION_MAPPING.md).
import type {
  AvailabilityStatus,
  DataProvenance,
  DataSourceType,
  PriceType,
  SpecGroup,
  SpecValueType,
  VehicleCategory,
} from "@/lib/domain/catalogue/enums";

export type {
  AvailabilityStatus,
  DataProvenance,
  DataSourceType,
  PriceType,
  SpecGroup,
  SpecValueType,
  VehicleCategory,
};

export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ManufacturerRef {
  slug: string;
  name: string;
}

export interface ManufacturerSummary {
  id: string;
  slug: string;
  name: string;
  countryOfOrigin: string | null;
  modelCount: number;
  isDemo: boolean;
  updatedAt: string;
}

export interface ManufacturerDetail {
  id: string;
  slug: string;
  name: string;
  countryOfOrigin: string | null;
  websiteUrl: string | null;
  description: string | null;
  isDemo: boolean;
  updatedAt: string;
  models: MotorcycleCard[];
}

export interface Image {
  url: string;
  altText: string;
  width: number;
  height: number;
  credit: string | null;
}

export interface PriceSummary {
  amount: number;
  currencyCode: string;
  priceType: PriceType;
  provenance: DataProvenance;
  variantName: string;
}

export interface MotorcycleCard {
  id: string;
  slug: string;
  name: string;
  manufacturer: ManufacturerRef;
  category: VehicleCategory;
  availabilityStatus: AvailabilityStatus;
  launchYear: number | null;
  summary: string | null;
  startingPrice: PriceSummary | null;
  displacementCc: number | null;
  maxPowerKw: number | null;
  maxTorqueNm: number | null;
  fuelType: string | null;
  image: Image | null;
  isDemo: boolean;
  updatedAt: string;
}

export interface Price {
  amount: number;
  currencyCode: string;
  priceType: PriceType;
  regionCode: string | null;
  effectiveFrom: string;
  provenance: DataProvenance;
  sourceId: string | null;
}

export interface Variant {
  id: string;
  slug: string;
  name: string;
  modelYear: number | null;
  isBase: boolean;
  prices: Price[];
}

export interface SpecValue {
  number: number | null;
  text: string | null;
  boolean: boolean | null;
  provenance: DataProvenance;
  sourceId: string | null;
}

export interface SpecRow {
  key: string;
  label: string;
  unit: string | null;
  valueType: SpecValueType;
  /** Index-aligned with MotorcycleDetail.variants; null means unknown. */
  values: (SpecValue | null)[];
}

export interface SpecGroupData {
  group: SpecGroup;
  specs: SpecRow[];
}

export interface Citation {
  id: string;
  sourceName: string;
  sourceType: DataSourceType;
  url: string | null;
  title: string | null;
  retrievedAt: string;
}

export interface MotorcycleDetail {
  id: string;
  slug: string;
  name: string;
  manufacturer: ManufacturerRef;
  category: VehicleCategory;
  availabilityStatus: AvailabilityStatus;
  launchYear: number | null;
  summary: string | null;
  description: string | null;
  isDemo: boolean;
  updatedAt: string;
  publishedAt: string | null;
  variants: Variant[];
  specGroups: SpecGroupData[];
  images: Image[];
  sources: Citation[];
  related: MotorcycleCard[];
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface NumericRange {
  min: number;
  max: number;
}

export interface CatalogueFilters {
  manufacturers: FacetOption[];
  categories: FacetOption[];
  availabilityStatuses: FacetOption[];
  fuelTypes: string[];
  transmissions: string[];
  absOptions: string[];
  price: NumericRange | null;
  displacementCc: NumericRange | null;
  launchYear: NumericRange | null;
}

export interface SitemapEntry {
  type: "motorcycle" | "manufacturer";
  slug: string;
  updatedAt: string;
}
