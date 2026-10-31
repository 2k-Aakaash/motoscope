/**
 * Carapis response shapes, verified against live responses on 2026-10-31 (`/apix/api/sources/`,
 * `/apix/api/vehicles/`, `/apix/api/vehicles/{id}/`). The provider calls its schema "indicative": every field is
 * optional here and normalize.ts type-checks each value before use.
 */

/** Paginated envelope used by `/vehicles/`. */
export interface CarapisPage<T> {
  count?: number;
  page?: number;
  pages?: number;
  page_size?: number;
  has_next?: boolean;
  has_previous?: boolean;
  next_page?: number | null;
  previous_page?: number | null;
  results?: T[];
}

export interface CarapisPhoto {
  url?: string;
  thumb_url?: string;
  original_url?: string;
  is_main?: boolean;
  position?: number;
}

export interface CarapisSourceLocation {
  iso2?: string;
  country_name?: string;
  region_text?: string;
}

/** List view item (observed: 32 fields). Note: no listing URL and no engine size in the list view. */
export interface CarapisVehicle {
  id?: string;
  source_code?: string;
  brand_name?: string;
  brand_slug?: string;
  model_name?: string;
  model_slug?: string;
  trim?: string;
  year?: number;
  /** Original listing price as a decimal string, in `price_original_currency`. */
  price_original?: string | number;
  price_original_currency?: string;
  /** Provider's USD conversion — deliberately not used by MotoScope. */
  price_usd?: number;
  mileage?: number;
  fuel_type?: string;
  transmission?: string;
  body_type?: string;
  color?: string;
  seller_type?: string;
  region?: string;
  source_location?: CarapisSourceLocation;
  is_new_vehicle?: boolean;
  is_available?: boolean;
  status?: string;
  first_seen_at?: string;
  last_seen_at?: string;
  thumb?: CarapisPhoto;
  photos?: CarapisPhoto[];
}

/** Detail view = list view + 21 more fields (observed). */
export interface CarapisVehicleDetail extends CarapisVehicle {
  listing_url?: string;
  listing_id?: string;
  engine_cc?: number | null;
  seat_count?: number | null;
  drive_type?: string;
  description?: string;
}

/** `/sources/`: the sources this API key can query (authoritative per the provider). */
export interface CarapisSource {
  code?: string;
  name?: string;
  country?: string;
  region?: string;
  /** Observed values: "live", "on_demand". */
  availability?: string;
  last_parsed_at?: string;
}

/** Query parameters accepted by `/vehicles/` (the provider lists them in its 400 response for unknown parameters). */
export interface CarapisVehicleQuery {
  source: string;
  brand?: string;
  model?: string;
  search?: string;
  min_year?: number;
  max_year?: number;
  min_price?: number;
  max_price?: number;
  /** Currency the price filters are expressed in. Without it the provider filters on its USD conversion. */
  price_currency?: string;
  min_engine_cc?: number;
  max_engine_cc?: number;
  fuel_type?: string;
  transmission?: string;
  body_type?: string;
  is_new_vehicle?: boolean;
  available_only?: boolean;
  page?: number;
  page_size?: number;
}
