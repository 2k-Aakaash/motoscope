import { json } from "@/lib/http/problem";
import { route } from "@/lib/http/route";
import { getManufacturer } from "@/lib/services/catalogue";
import { parseMarket } from "@/lib/validation/catalogue";

export const dynamic = "force-dynamic";

/** A manufacturer and its published models. ?market= ISO country code for prices (default IN). */
export const GET = route<{ slug: string }>({ rateLimit: "public-read" }, async ({ params, url }) =>
  json(await getManufacturer(params.slug, parseMarket(url.searchParams))),
);
