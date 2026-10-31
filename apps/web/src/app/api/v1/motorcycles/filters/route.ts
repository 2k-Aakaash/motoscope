import { json } from "@/lib/http/problem";
import { route } from "@/lib/http/route";
import { getCatalogueFilters } from "@/lib/services/catalogue";
import { parseMarket } from "@/lib/validation/catalogue";

export const dynamic = "force-dynamic";

/** Filter options and value ranges for the catalogue UI. */
export const GET = route({ rateLimit: "public-read" }, async ({ url }) =>
  json(await getCatalogueFilters(parseMarket(url.searchParams))),
);
