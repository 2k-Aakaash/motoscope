import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ListingCard } from "@/components/listing-card";
import { Notice } from "@/components/notice";
import { Pagination } from "@/components/pagination";
import { isCarapisConfigured } from "@/lib/carapis/config";
import { CarapisError } from "@/lib/carapis/errors";
import { indianCarapisSources } from "@/lib/carapis/sources";
import { ValidationError } from "@/lib/http/errors";
import { parseVehiclesQuery } from "@/lib/vehicles/query";
import { listVehicles, type VehicleListResult } from "@/lib/vehicles/service";

export const metadata: Metadata = {
  title: "Marketplace listings (beta)",
  description: "Third-party vehicle marketplace listings, clearly separated from official specifications.",
  // Third-party listing pages are thin, duplicate and short-lived: never indexed.
  robots: { index: false, follow: true },
};

const FILTER_KEYS = ["source", "make", "model", "year_min", "year_max", "price_min", "price_max"] as const;

function pageHref(params: URLSearchParams, page: number): string {
  const next = new URLSearchParams(params);
  if (page > 1) next.set("page", String(page));
  else next.delete("page");
  return `/listings?${next.toString()}`;
}

/** Explains a provider failure without exposing internals. */
function providerProblem(error: CarapisError) {
  switch (error.code) {
    case "CARAPIS_FORBIDDEN":
      return "This source is not available on our provider plan. Indian sources must be activated with the provider first.";
    case "CARAPIS_RATE_LIMITED":
      return "We have reached the provider's request limit. Please try again later.";
    case "CARAPIS_INVALID_REQUEST":
      return "The provider did not accept this search (for example, an unknown source). Adjust the filters and try again.";
    default:
      return error.message;
  }
}

export default async function ListingsPage(props: PageProps<"/listings">) {
  await connection();
  const raw = await props.searchParams;
  const params = new URLSearchParams();
  for (const key of [...FILTER_KEYS, "page"]) {
    const value = raw[key];
    const first = Array.isArray(value) ? value[0] : value;
    if (first?.trim()) params.set(key, first.trim());
  }
  const configured = isCarapisConfigured();
  const selected = params.get("source");
  const sourceName = (slug: string) => indianCarapisSources.find((s) => s.slug === slug)?.name ?? slug;

  let result: VehicleListResult | null = null;
  let problem: { title: string; body: string } | null = null;
  if (configured && selected) {
    try {
      result = await listVehicles(parseVehiclesQuery(params));
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

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: "Marketplace listings" }]} />
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Marketplace listings (beta)</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Vehicles advertised on third-party marketplaces, retrieved through our data provider. Prices are
        sellers&apos; asking prices in the listed currency, not official or ex-showroom prices. For official
        specifications, use the{" "}
        <Link href="/motorcycles" className="link">
          motorcycle catalogue
        </Link>
        .
      </p>

      {!configured ? (
        <div className="mt-8">
          <Notice title="Marketplace listings are not connected yet">
            The listings provider has not been configured for this site, so no listings can be shown. Indian
            marketplace sources also need to be activated with the provider before they return data.
          </Notice>
        </div>
      ) : (
        <form
          action="/listings"
          method="get"
          className="mt-8 grid gap-3 rounded-lg border border-line bg-surface p-4 sm:grid-cols-3 lg:grid-cols-6"
        >
          <div className="sm:col-span-3 lg:col-span-2">
            <label htmlFor="l-source" className="text-xs text-muted">
              Marketplace
            </label>
            <select id="l-source" name="source" defaultValue={selected ?? ""} required className="input mt-1">
              <option value="" disabled>
                Choose a marketplace
              </option>
              {indianCarapisSources.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.name}
                  {s.docsStatus === "on_request" ? " (activation required)" : ""}
                </option>
              ))}
            </select>
          </div>
          {(
            [
              ["make", "Make", "text"],
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
          <div className="flex items-end sm:col-span-3 lg:col-span-6">
            <button type="submit" className="btn-primary">
              Show listings
            </button>
          </div>
        </form>
      )}

      {problem && (
        <div className="mt-6">
          <Notice tone="warning" title={problem.title}>
            {problem.body}
          </Notice>
        </div>
      )}

      {configured && !selected && (
        <p className="mt-6 text-sm text-muted">Choose a marketplace to see its listings.</p>
      )}

      {result && (
        <section className="mt-8" aria-label="Listings">
          <p className="text-sm text-muted" aria-live="polite">
            {result.pagination.count === 1 ? "1 listing" : `${result.pagination.count} listings`} from{" "}
            {sourceName(result.meta.source)} · data may be up to {Math.round(result.meta.maxAgeSeconds / 60)}{" "}
            minutes old
          </p>
          {result.data.length === 0 ? (
            <div className="mt-4">
              <Notice title="No listings returned">
                The provider returned no listings for this marketplace and filters. MotoScope does not fill
                empty results with sample data.
              </Notice>
            </div>
          ) : (
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.data.map((vehicle) => (
                <li key={vehicle.id} className="flex">
                  <ListingCard
                    vehicle={vehicle}
                    sourceName={sourceName(vehicle.source ?? result.meta.source)}
                  />
                </li>
              ))}
            </ul>
          )}
          <Pagination
            page={result.pagination.page}
            totalPages={Math.min(
              Math.ceil(result.pagination.count / Math.max(1, result.pagination.limit)),
              Math.floor(10_000 / Math.max(1, result.pagination.limit)),
            )}
            hrefFor={(page) => pageHref(params, page)}
          />
        </section>
      )}
    </div>
  );
}
