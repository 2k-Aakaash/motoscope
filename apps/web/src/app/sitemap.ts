import type { MetadataRoute } from "next";
import { unstable_rethrow } from "next/navigation";
import { getSitemapEntries } from "@/lib/data/catalogue";
import { logger } from "@/lib/logging/logger";
import { absoluteUrl } from "@/lib/site";

const staticPaths = ["/", "/motorcycles", "/manufacturers", "/about", "/data-sources", "/editorial-policy"];

/** Built from published content only. If the database is unreachable, static pages are still listed. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = staticPaths.map((path) => ({ url: absoluteUrl(path) }));

  try {
    const entries = await getSitemapEntries();
    for (const entry of entries) {
      const prefix = entry.type === "motorcycle" ? "/motorcycles" : "/manufacturers";
      pages.push({ url: absoluteUrl(`${prefix}/${entry.slug}`), lastModified: entry.updatedAt });
    }
  } catch (error) {
    unstable_rethrow(error); // let Next.js dynamic-rendering signals through
    logger.error("Sitemap entries unavailable; serving static pages only", {}, error);
  }

  return pages;
}
