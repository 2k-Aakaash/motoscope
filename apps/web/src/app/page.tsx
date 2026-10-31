import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { MotorcycleCard } from "@/components/motorcycle-card";
import { DemoDataNotice, Notice } from "@/components/notice";
import { SearchForm } from "@/components/site-header";
import { getCatalogueFilters, listManufacturers, searchMotorcycles } from "@/lib/data/catalogue";
import { logger } from "@/lib/logging/logger";
import { categoryLabels, labelFor } from "@/lib/labels";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** The homepage must render even when the database is unavailable; data sections degrade to a notice. */
async function loadHomeData() {
  try {
    const [recent, filters, manufacturers] = await Promise.all([
      searchMotorcycles(new URLSearchParams({ sort: "updated", pageSize: "6" })),
      getCatalogueFilters(),
      listManufacturers(),
    ]);
    return { recent, filters, manufacturers: manufacturers.filter((m) => m.modelCount > 0) };
  } catch (error) {
    unstable_rethrow(error); // let Next.js dynamic-rendering signals through
    logger.error("Homepage data unavailable", { page: "/" }, error);
    return null;
  }
}

const principles = [
  {
    title: "Every value has a source",
    body: "Specifications are labelled as manufacturer claims, editorially verified, owner reported or estimates, with citations.",
  },
  {
    title: "Prices say what they are",
    body: "Ex-showroom, on-road and estimated prices are always labelled. An estimate is never presented as an official price.",
  },
  {
    title: "Unknown stays unknown",
    body: "When a figure is not confirmed we show a gap rather than a guess. No invented ratings, counts or statistics.",
  },
];

export default async function HomePage() {
  const data = await loadHomeData();
  const total = data?.recent.totalCount ?? 0;

  return (
    <>
      <section className="border-b border-line bg-surface">
        <div className="container-page grid gap-10 py-14 md:py-20 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow">India-first motorcycle intelligence</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl leading-[1.05] font-bold tracking-tight sm:text-5xl">
              {site.tagline}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Research motorcycles with structured specifications, clearly labelled prices and visible sources
              — built for buyers comparing their next machine.
            </p>
            <SearchForm id="home-search" className="mt-8 max-w-xl" />
          </div>

          {data && data.filters.categories.length > 0 && (
            <nav aria-label="Browse by category">
              <p className="text-sm font-semibold">Browse by category</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {data.filters.categories.map((c) => (
                  <li key={c.value}>
                    <Link
                      href={`/motorcycles?category=${encodeURIComponent(c.value)}`}
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-3.5 py-1.5 text-sm hover:border-accent"
                    >
                      {labelFor(categoryLabels, c.value)}
                      <span className="text-xs text-muted tabular-nums">{c.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </div>
      </section>

      <div className="container-page">
        {!data ? (
          <div className="mt-12">
            <Notice tone="warning" title="Motorcycle data is temporarily unavailable">
              We could not reach the MotoScope data service. Search and browsing will work again shortly.
            </Notice>
          </div>
        ) : total === 0 ? (
          <div className="mt-12">
            <Notice title="No motorcycles have been published yet">
              <p>
                This MotoScope instance has an empty catalogue. Editors can publish models through the admin
                API. For local development, run{" "}
                <code className="rounded bg-surface-muted px-1">npm run db:seed</code> in{" "}
                <code className="rounded bg-surface-muted px-1">apps/web</code> to load the clearly labelled
                demo dataset (see the README).
              </p>
            </Notice>
          </div>
        ) : (
          <>
            {data.recent.items.some((m) => m.isDemo) && (
              <div className="mt-10">
                <DemoDataNotice />
              </div>
            )}

            <section className="mt-12" aria-labelledby="recent-heading">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id="recent-heading" className="font-display text-2xl font-semibold">
                  Recently updated profiles
                </h2>
                <Link href="/motorcycles" className="link text-sm">
                  Browse all {total} motorcycles
                </Link>
              </div>
              <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data.recent.items.map((bike) => (
                  <li key={bike.id} className="flex">
                    <MotorcycleCard bike={bike} />
                  </li>
                ))}
              </ul>
            </section>

            {data.manufacturers.length > 0 && (
              <section className="mt-14" aria-labelledby="makers-heading">
                <h2 id="makers-heading" className="font-display text-2xl font-semibold">
                  Manufacturers
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {data.manufacturers.map((m) => (
                    <li key={m.id}>
                      <Link
                        href={`/manufacturers/${m.slug}`}
                        className="inline-flex rounded-md border border-line bg-surface px-4 py-2 text-sm font-medium hover:border-accent"
                      >
                        {m.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        <section className="mt-16" aria-labelledby="principles-heading">
          <h2 id="principles-heading" className="font-display text-2xl font-semibold">
            How MotoScope treats data
          </h2>
          <ul className="mt-5 grid gap-6 md:grid-cols-3">
            {principles.map((p) => (
              <li key={p.title} className="border-l-2 border-accent pl-4">
                <p className="font-semibold">{p.title}</p>
                <p className="mt-1 text-sm text-muted">{p.body}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm">
            <Link href="/data-sources" className="link">
              Read our data sources and methodology
            </Link>
          </p>
        </section>
      </div>
    </>
  );
}
