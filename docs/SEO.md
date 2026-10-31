# SEO

Search is a primary acquisition channel. Public pages are server-rendered HTML with complete content and metadata on first response.

## URL structure

| Page | URL | Indexing |
|---|---|---|
| Home | `/` | index |
| Catalogue | `/motorcycles` | index |
| Single-category / single-manufacturer views | `/motorcycles?category=Naked`, `/motorcycles?manufacturer=arka-motors` (plus `page=N`) | index, self-canonical |
| Other filter combinations, searches, non-default sorts | `/motorcycles?...` | `noindex, follow`, canonical → `/motorcycles` |
| Motorcycle profile | `/motorcycles/{model-slug}` | index (demo records: noindex) |
| Manufacturers | `/manufacturers`, `/manufacturers/{slug}` | index (demo: noindex) |
| Policy and info pages | `/about`, `/data-sources`, `/editorial-policy`, `/privacy`, `/terms` | index |

Slugs are stable, lowercase ASCII and globally unique for models (`{manufacturer}-{model}`). They stay reserved after archival so URLs are never reused for a different bike. A redirect table for renamed slugs is planned before editors can change slugs of published models at scale.

The indexing rules live in `apps/web/src/lib/catalogue-query.ts` (`isIndexable`, `canonicalPath`) and are unit-tested.

## Metadata
- A unique `<title>` and description per page (template `%s | MotoScope`), plus a canonical URL on every page.
- Open Graph and Twitter card defaults in the root layout. Profiles set their own title, description and URL.
- **Environment safety:** indexing is opt-in. Unless `SITE_INDEXING=enabled`, the site serves `noindex` and a disallow-all `robots.txt`, so previews and staging are never indexed.

## Structured data (only what is visible on the page)
- `WebSite` with `SearchAction` (root layout).
- `BreadcrumbList` on every page with breadcrumbs.
- **Product is deliberately not emitted yet.** Google's Product rich results require offers, reviews or ratings. MotoScope will not fabricate them, and "Illustrative" or "Estimated" prices must not be marked up as offers. Add `Product` + `Offer` only for verified ex-showroom prices with source and date.
- `Article` will be added with editorial content.

## Sitemap and robots
- `/sitemap.xml` lists static pages plus every published motorcycle and manufacturer from `/api/v1/sitemap-entries`, with `lastModified`. If the API is unreachable, static pages are still served.
- `/robots.txt` disallows `/api/` and `/admin` and references the sitemap (when indexing is enabled).

## Status codes
Unknown or unpublished slugs return a real HTTP 404 with a helpful not-found page. To keep this, routes that can 404 must not have a `loading.tsx` or Suspense boundary above the `notFound()` call, because streaming would commit a 200 first. The catalogue skeleton lives in the `(catalogue)` route group for this reason.

## Content architecture and internal linking
- Profile → manufacturer, related models (same category first) and catalogue breadcrumbs.
- Manufacturer → all its models, plus a link to the filtered catalogue view.
- Home → category landing views, recently updated profiles and manufacturers.
- Planned: comparison pages (`/compare/{a}-vs-{b}`) for popular pairs, reliability issue pages linked from profiles, and buying guides linking to profiles and comparisons.

## Performance (affects ranking)
Server Components by default. The only client JS covers mobile nav, the filter disclosure and the sort select. Images use `next/image` with explicit sizes. Two variable fonts with `display: swap`. No Lighthouse score is claimed yet: run it against a production build or a deployed preview and record the result here.
