import { json } from "@/lib/http/problem";
import { route } from "@/lib/http/route";
import { searchMotorcycles } from "@/lib/services/catalogue";
import { parseMotorcycleSearch } from "@/lib/validation/catalogue";

export const dynamic = "force-dynamic";

/** Searches, filters, sorts and paginates published motorcycle models (see docs/API.md for parameters). */
export const GET = route({ rateLimit: "public-read" }, async ({ url }) =>
  json(await searchMotorcycles(parseMotorcycleSearch(url.searchParams))),
);
