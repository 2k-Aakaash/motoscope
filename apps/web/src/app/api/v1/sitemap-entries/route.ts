import { json } from "@/lib/http/problem";
import { route } from "@/lib/http/route";
import { getSitemapEntries } from "@/lib/services/catalogue";

export const dynamic = "force-dynamic";

/** Published, indexable entities for the XML sitemap. */
export const GET = route({ rateLimit: "public-read" }, async () => json(await getSitemapEntries()));
