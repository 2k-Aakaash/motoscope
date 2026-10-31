import type { Metadata } from "next";
import Link from "next/link";
import { FilterDisclosure } from "@/components/catalogue/filter-disclosure";
import { FILTER_FORM_ID, FilterPanel } from "@/components/catalogue/filter-panel";
import { SortSelect } from "@/components/catalogue/sort-select";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MotorcycleCard } from "@/components/motorcycle-card";
import { DemoDataNotice, Notice } from "@/components/notice";
import { Pagination } from "@/components/pagination";
import { getCatalogueFilters, searchMotorcycles } from "@/lib/data/catalogue";
import { ValidationError } from "@/lib/http/errors";
import {
  activeFilterCount,
  canonicalPath,
  catalogueHref,
  filterChips,
  isIndexable,
  parseCatalogueParams,
  toApiQuery,
  type CatalogueParams,
} from "@/lib/catalogue-query";
import { categoryLabels, labelFor } from "@/lib/labels";

function headingFor(params: CatalogueParams): string {
  if (params.category.length === 1 && activeFilterCount(params) === 1)
    return `${labelFor(categoryLabels, params.category[0])} motorcycles`;
  return "Motorcycles";
}

export async function generateMetadata(props: PageProps<"/motorcycles">): Promise<Metadata> {
  const params = parseCatalogueParams(await props.searchParams);
  const heading = headingFor(params);
  return {
    title: params.page > 1 ? `${heading} — page ${params.page}` : `${heading} in India: specs and prices`,
    description:
      "Search and filter motorcycles by price, engine capacity, category, seat height, weight and more. Every specification shows its source.",
    alternates: { canonical: canonicalPath(params) },
    // Thin or duplicate filter combinations are crawlable (follow) but not indexed.
    robots: isIndexable(params) ? undefined : { index: false, follow: true },
  };
}

export default async function MotorcyclesPage(props: PageProps<"/motorcycles">) {
  const params = parseCatalogueParams(await props.searchParams);

  let results;
  try {
    results = await searchMotorcycles(toApiQuery(params));
  } catch (error) {
    if (error instanceof ValidationError) {
      return (
        <div className="container-page py-10">
          <Notice
            title="Some filters in this link are not valid"
            action={
              <Link href="/motorcycles" className="btn-primary">
                Show all motorcycles
              </Link>
            }
          >
            The link may be outdated or edited by hand. Reset the filters and try again.
          </Notice>
        </div>
      );
    }
    throw error;
  }
  const filters = await getCatalogueFilters();

  const manufacturerNames = Object.fromEntries(filters.manufacturers.map((m) => [m.value, m.label]));
  const chips = filterChips(params, manufacturerNames);
  const filterCount = activeFilterCount(params);
  const heading = headingFor(params);
  const showsDemo = results.items.some((m) => m.isDemo);

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: "Motorcycles", href: "/motorcycles" }]} />
      <div className="mt-4 mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{heading}</h1>
          <p className="mt-1 text-sm text-muted" aria-live="polite">
            {results.totalCount === 1 ? "1 motorcycle" : `${results.totalCount} motorcycles`}
            {filterCount > 0 && " match your filters"}
          </p>
        </div>
        <SortSelect value={params.sort} formId={FILTER_FORM_ID} />
      </div>

      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        <aside>
          <FilterDisclosure activeCount={filterCount}>
            <FilterPanel params={params} filters={filters} />
          </FilterDisclosure>
        </aside>

        <section aria-label="Results">
          {chips.length > 0 && (
            <ul className="mb-5 flex flex-wrap gap-2" aria-label="Active filters">
              {chips.map((chip) => (
                <li key={chip.label}>
                  <Link
                    href={chip.removeHref}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-sm hover:border-accent"
                  >
                    {chip.label}
                    <span aria-hidden="true">×</span>
                    <span className="sr-only">(remove filter)</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/motorcycles" className="link inline-block px-2 py-1 text-sm">
                  Clear all
                </Link>
              </li>
            </ul>
          )}

          {showsDemo && (
            <div className="mb-5">
              <DemoDataNotice />
            </div>
          )}

          {results.items.length === 0 ? (
            results.totalCount > 0 ? (
              <Notice
                title="This page is past the end of the results"
                action={
                  <Link href={catalogueHref(params, { page: 1 })} className="btn-secondary">
                    Go to the first page
                  </Link>
                }
              />
            ) : filterCount > 0 ? (
              <Notice
                title="No motorcycles match these filters"
                action={
                  <Link href="/motorcycles" className="btn-secondary">
                    Clear filters
                  </Link>
                }
              >
                Try widening the price or engine range, or removing a filter above. Values we do not know yet
                are never assumed, so a motorcycle with an unknown seat height will not match a seat-height
                filter.
              </Notice>
            ) : (
              <Notice title="No motorcycles have been published yet">
                Editors can add models through the admin API. For local development, run the demo seed
                described in the README.
              </Notice>
            )
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.items.map((bike) => (
                <li key={bike.id} className="flex">
                  <MotorcycleCard bike={bike} headingLevel={2} />
                </li>
              ))}
            </ul>
          )}

          <Pagination
            page={results.page}
            totalPages={results.totalPages}
            hrefFor={(page) => catalogueHref(params, { page })}
          />
        </section>
      </div>
    </div>
  );
}
