import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ListingCard } from "@/components/listing-card";
import { Notice } from "@/components/notice";
import { Pagination } from "@/components/pagination";
import { isCarapisConfigured } from "@/lib/carapis/config";
import { CarapisError } from "@/lib/carapis/errors";
import { ValidationError } from "@/lib/http/errors";
import { formatDate } from "@/lib/format";
import { parseVehiclesQuery } from "@/lib/vehicles/query";
import {
  getSourceStatuses,
  listVehicles,
  type SourceStatusEntry,
  type VehicleListResult,
} from "@/lib/vehicles/service";

export const metadata: Metadata = {
  title: "Marketplace listings (beta)",
  description: "Third-party vehicle marketplace listings, clearly separated from official specifications.",
  // Third-party listing pages are thin, duplicate and short-lived: never indexed.
  robots: { index: false, follow: true },
};

const FILTER_KEYS = ["source", "manufacturer", "model", "year_min", "year_max", "page"] as const;

function pageHref(params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page > 1) next.set("page", String(page));
  else next.delete("page");
  return `/listings?${next.toString()}`;
}

function providerProblem(error: CarapisError): string {
  switch (error.code) {
    case "CARAPIS_RATE_LIMITED":
      return "We have reached the data provider's request limit. Please try again later.";
    case "CARAPIS_UNAUTHORIZED":
    case "CARAPIS_MISCONFIGURED":
      return "The listings provider is not configured correctly. This has been logged for the site team.";
    default:
      return error.message;
  }
}

function SourceTile({ source, selected }: { source: SourceStatusEntry; selected: boolean }) {
  const available = source.status === "available";
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="font-semibold">{source.name}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${available ? "bg-surface-muted text-fg" : "bg-warn-bg text-warn-fg"}`}
        >
          {available ? "Available" : "Requires activation"}
        </span>
      </span>
      {source.docsDescription && (
        <span className="mt-1 block text-sm text-muted">{source.docsDescription}</span>
      )}
      {available && source.lastParsedAt && (
        <span className="mt-1 block text-xs text-muted">
          Last refreshed {formatDate(source.lastParsedAt)}
        </span>
      )}
    </>
  );
  return available ? (
    <Link
      href={`/listings?source=${encodeURIComponent(source.code)}`}
      aria-current={selected ? "true" : undefined}
      className={`block rounded-lg border p-4 hover:border-accent ${selected ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}
    >
      {body}
    </Link>
  ) : (
    <div className="rounded-lg border border-dashed border-line p-4">{body}</div>
  );
}

export default async function ListingsPage(props: PageProps<"/listings">) {
  await connection();
  const raw = await props.searchParams;
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const value = raw[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first?.trim()) params.set(key, first.trim());
  }
  const selected = params.get("source");
  const configured = isCarapisConfigured();

  let sources: SourceStatusEntry[] | null = null;
  let result: VehicleListResult | null = null;
  let problem: { title: string; body: string } | null = null;

  if (configured) {
    try {
      sources = await getSourceStatuses();
      const chosen = sources.find((s) => s.code === selected);
      if (selected && !chosen) {
        problem = { title: "Unknown marketplace", body: "Choose one of the marketplaces listed above." };
      } else if (chosen && chosen.status !== "available") {
        problem = {
          title: `${chosen.name} requires activation`,
          body: "This marketplace is not yet activated on our data provider account, so no listings can be shown.",
        };
      } else if (chosen) {
        result = await listVehicles(parseVehiclesQuery(params));
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        problem = { title: "Some filters are not valid", body: Object.values(error.errors).flat().join(" ") };
      } else if (error instanceof CarapisError) {
        problem = { title: "Listings could not be loaded", body: providerProblem(error) };
      } else {
        throw error;
      }
    }
  }

  const activated = sources?.filter((s) => s.status === "available") ?? [];

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: "Marketplace listings" }]} />
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Marketplace listings (beta)</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Vehicles advertised on Indian marketplaces, retrieved through our data provider. Prices are
        sellers&apos; asking prices in the listed currency, not official, ex-showroom or on-road prices. For
        official specifications, use the{" "}
        <Link href="/motorcycles" className="link">
          motorcycle catalogue
        </Link>
        .
      </p>

      {!configured && (
        <div className="mt-8">
          <Notice title="Marketplace listings are not connected yet">
            The listings provider has not been configured for this site, so no listings can be shown.
          </Notice>
        </div>
      )}

      {sources && (
        <section className="mt-8" aria-labelledby="sources-heading">
          <h2 id="sources-heading" className="sr-only">
            Marketplaces
          </h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {sources.map((s) => (
              <li key={s.code}>
                <SourceTile source={s} selected={s.code === selected} />
              </li>
            ))}
          </ul>
          {activated.length === 0 && (
            <div className="mt-4">
              <Notice title="No Indian marketplace is activated yet">
                These marketplaces are supported by our data provider on request and have not been activated
                for MotoScope yet. MotoScope does not show sample or substitute listings in the meantime.
              </Notice>
            </div>
          )}
        </section>
      )}

      {problem && (
        <div className="mt-6">
          <Notice tone="warning" title={problem.title}>
            {problem.body}
          </Notice>
        </div>
      )}

      {result && (
        <section className="mt-8" aria-label="Listings">
          <form action="/listings" method="get" className="mb-6 grid gap-3 sm:grid-cols-5">
            <input type="hidden" name="source" value={result.source} />
            {(
              [
                ["manufacturer", "Manufacturer", "text"],
                ["model", "Model", "text"],
                ["year_min", "Year from", "number"],
                ["year_max", "Year to", "number"],
              ] as const
            ).map(([name, label, type]) => (
              <div key={name}>
                <label htmlFor={`l-${name}`} className="text-xs text-muted">
                  {label}
                </label>
                <input
                  id={`l-${name}`}
                  name={name}
                  type={type}
                  defaultValue={params.get(name) ?? ""}
                  className="input mt-1"
                />
              </div>
            ))}
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full">
                Filter
              </button>
            </div>
          </form>
          <p className="text-sm text-muted" aria-live="polite">
            {result.pagination.total === null
              ? `${result.data.length} listings on this page`
              : `${result.pagination.total.toLocaleString("en-IN")} listings`}{" "}
            · data may be up to {Math.round(result.meta.maxAgeSeconds / 60)} minutes old
          </p>
          {result.data.length === 0 ? (
            <div className="mt-4">
              <Notice title="No listings returned">
                The provider returned no listings for these filters. MotoScope does not fill empty results
                with sample data.
              </Notice>
            </div>
          ) : (
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.data.map((vehicle) => (
                <li key={vehicle.id} className="flex">
                  <ListingCard vehicle={vehicle} />
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={result.pagination.page}
            totalPages={Math.min(
              10_000, // MotoScope's maximum `page`
              result.pagination.totalPages ??
                (result.pagination.hasMore ? result.pagination.page + 1 : result.pagination.page),
            )}
            hrefFor={(page) => pageHref(params, page)}
          />
        </section>
      )}
    </div>
  );
}
