import { json } from "@/lib/http/problem";
import { route } from "@/lib/http/route";
import { getMotorcycle } from "@/lib/services/catalogue";
import { parseMarket } from "@/lib/validation/catalogue";

export const dynamic = "force-dynamic";

/** Full motorcycle profile: variants, prices, grouped specifications with provenance, sources and related models. */
export const GET = route<{ slug: string }>({ rateLimit: "public-read" }, async ({ params, url }) =>
  json(await getMotorcycle(params.slug, parseMarket(url.searchParams))),
);
