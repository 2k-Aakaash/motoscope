/**
 * Test fixture with the SHAPE of a real Carapis `/apix/api/vehicles/` list item (field names and nesting copied
 * from a live response on 2026-10-31). The values are invented test data — never used outside tests.
 */
export const listItemFixture = {
  id: "44c555f0-d8f1-4b0c-a608-0561e420a6c7",
  source_code: "bikewale",
  brand_name: "Example Motors",
  brand_slug: "example-motors",
  model_name: "Roadster",
  model_slug: "roadster",
  trim: "Disc",
  year: 2024,
  price_original: "125000.00",
  price_original_currency: "INR",
  price_usd: 1500,
  mileage: 1200,
  fuel_type: "gasoline",
  transmission: "manual",
  body_type: "motorcycle",
  seller_type: "dealer",
  region: "Karnataka",
  source_location: { iso2: "IN", country_name: "India", region_text: "Karnataka" },
  is_new_vehicle: false,
  is_available: true,
  status: "active",
  first_seen_at: "2026-10-30T06:42:45Z",
  last_seen_at: "2026-10-31T06:42:45Z",
  thumb: { url: "https://img.example/t.jpg", thumb_url: "https://img.example/t_s.jpg" },
  photos: [
    { url: "https://img.example/1.jpg", thumb_url: "https://img.example/1_s.jpg", is_main: true },
    { url: "javascript:alert(1)" },
  ],
};
