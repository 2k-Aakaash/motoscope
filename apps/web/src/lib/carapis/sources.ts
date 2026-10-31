/**
 * India-related Carapis platform slugs as listed in the provider documentation (docs.carapis.com/platforms,
 * retrieved 2026-10-31). `docsStatus` records what each platform page says — it is not live verification.
 * The authoritative list for our account is the provider's own sources endpoint once a key is available.
 */
export interface CarapisSourceInfo {
  slug: string;
  name: string;
  /** Vehicle types as described on the provider's platform page, or null when we have not checked that page. */
  docsVehicleTypes: string | null;
  docsStatus: "on_request" | "not_checked";
}

export const indianCarapisSources: CarapisSourceInfo[] = [
  {
    slug: "cardekho",
    name: "CarDekho",
    docsVehicleTypes: "Used, new and dealer cars",
    docsStatus: "on_request",
  },
  { slug: "carwale", name: "CarWale", docsVehicleTypes: "Used and new cars", docsStatus: "on_request" },
  {
    slug: "bikewale",
    name: "BikeWale",
    docsVehicleTypes: "Motorcycles and scooters (new)",
    docsStatus: "on_request",
  },
  {
    slug: "cars24-india",
    name: "Cars24 India",
    docsVehicleTypes: "Used cars and motorcycles",
    docsStatus: "on_request",
  },
  { slug: "cartrade", name: "CarTrade", docsVehicleTypes: null, docsStatus: "not_checked" },
  { slug: "droom", name: "Droom", docsVehicleTypes: null, docsStatus: "not_checked" },
  { slug: "spinny", name: "Spinny", docsVehicleTypes: null, docsStatus: "not_checked" },
  { slug: "zigwheels", name: "ZigWheels", docsVehicleTypes: null, docsStatus: "not_checked" },
  { slug: "olx-india", name: "OLX India", docsVehicleTypes: null, docsStatus: "not_checked" },
  {
    slug: "mahindra-first-choice",
    name: "Mahindra First Choice",
    docsVehicleTypes: null,
    docsStatus: "not_checked",
  },
  {
    slug: "maruti-true-value",
    name: "Maruti Suzuki True Value",
    docsVehicleTypes: null,
    docsStatus: "not_checked",
  },
  { slug: "team-bhp", name: "Team-BHP classifieds", docsVehicleTypes: null, docsStatus: "not_checked" },
  { slug: "truebil", name: "Truebil", docsVehicleTypes: null, docsStatus: "not_checked" },
];
