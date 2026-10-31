import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvailabilityBadge, DemoBadge, ProvenanceBadge } from "@/components/badges";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MotorcycleCard } from "@/components/motorcycle-card";
import { MotorcyclePlaceholder } from "@/components/motorcycle-placeholder";
import { SpecTables } from "@/components/motorcycle/spec-table";
import { DemoDataNotice } from "@/components/notice";
import { PriceTag, PriceUnavailable } from "@/components/price";
import { getMotorcycle } from "@/lib/data/catalogue";
import { formatDate, formatInr, formatSpecValue } from "@/lib/format";
import { categoryLabels, priceTypeLabels, provenanceLabels, sourceTypeLabels } from "@/lib/labels";
import { keySpec, specProvenances, startingPrice } from "@/lib/motorcycle";
import { absoluteUrl } from "@/lib/site";

// Product structured data is deliberately omitted until real offers exist: Google requires offers,
// reviews or ratings, and MotoScope will not fabricate them (docs/SEO.md).

const highlightKeys = [
  { key: "displacement_cc", label: "Engine" },
  { key: "max_power_kw", label: "Power" },
  { key: "max_torque_nm", label: "Torque" },
  { key: "kerb_weight_kg", label: "Kerb weight" },
  { key: "seat_height_mm", label: "Seat height" },
  { key: "claimed_mileage_kmpl", label: "Claimed mileage" },
  { key: "claimed_range_km", label: "Claimed range" },
] as const;

export async function generateMetadata(props: PageProps<"/motorcycles/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const bike = await getMotorcycle(slug);
  if (!bike) return { title: "Motorcycle not found", robots: { index: false } };

  const fullName = `${bike.manufacturer.name} ${bike.name}`;
  const price = startingPrice(bike);
  const description =
    bike.summary ??
    `${fullName} specifications, variants${price ? ", prices" : ""} and sources on MotoScope.`;
  return {
    title: `${fullName} — specifications${price ? " and price" : ""}`,
    description,
    alternates: { canonical: `/motorcycles/${bike.slug}` },
    openGraph: {
      title: fullName,
      description,
      url: absoluteUrl(`/motorcycles/${bike.slug}`),
      type: "website",
    },
    // Demo records are never meant to rank in search results.
    robots: bike.isDemo ? { index: false, follow: true } : undefined,
  };
}

export default async function MotorcyclePage(props: PageProps<"/motorcycles/[slug]">) {
  const { slug } = await props.params;
  const bike = await getMotorcycle(slug);
  if (!bike) notFound();

  const fullName = `${bike.manufacturer.name} ${bike.name}`;
  const price = startingPrice(bike);
  const provenances = specProvenances(bike);
  const highlights = highlightKeys
    .map((h) => ({ ...h, spec: keySpec(bike, h.key) }))
    .filter((h) => h.spec !== null);
  const primaryImage = bike.images[0];
  const hasPrices = bike.variants.some((v) => v.prices.length > 0);

  const sections = [
    { id: "variants", label: "Variants & prices" },
    { id: "specifications", label: "Specifications" },
    { id: "sources", label: "Sources" },
    ...(bike.related.length > 0 ? [{ id: "related", label: "Related" }] : []),
  ];

  return (
    <article className="container-page py-8">
      <Breadcrumbs
        items={[
          { label: "Motorcycles", href: "/motorcycles" },
          { label: bike.manufacturer.name, href: `/manufacturers/${bike.manufacturer.slug}` },
          { label: bike.name },
        ]}
      />

      <header className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-surface-muted">
          {primaryImage ? (
            <Image
              src={primaryImage.url}
              alt={primaryImage.altText}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          ) : (
            <MotorcyclePlaceholder />
          )}
          {primaryImage?.credit && (
            <p className="absolute right-2 bottom-2 rounded bg-black/60 px-2 py-0.5 text-[11px] text-white">
              {primaryImage.credit}
            </p>
          )}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {bike.isDemo && <DemoBadge />}
            <AvailabilityBadge status={bike.availabilityStatus} />
            <span className="text-sm text-muted">
              {categoryLabels[bike.category]}
              {bike.launchYear && ` · Launched ${bike.launchYear}`}
            </span>
          </div>
          <p className="mt-3 text-sm">
            <Link href={`/manufacturers/${bike.manufacturer.slug}`} className="link">
              {bike.manufacturer.name}
            </Link>
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{fullName}</h1>
          {bike.summary && <p className="mt-3 text-muted">{bike.summary}</p>}

          <div className="mt-6 rounded-lg border border-line bg-surface p-4">
            {price ? (
              <>
                <PriceTag
                  amount={price.price.amount}
                  priceType={price.price.priceType}
                  prefix="From"
                  size="lg"
                />
                <p className="mt-1 text-xs text-muted">
                  {price.variantName} variant · effective {formatDate(price.price.effectiveFrom)}. Prices are
                  indicative, not quotes; confirm with a dealer.
                </p>
              </>
            ) : (
              <PriceUnavailable upcoming={bike.availabilityStatus === "Upcoming"} />
            )}
          </div>

          {highlights.length > 0 && (
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              {highlights.map((h) => (
                <div key={h.key}>
                  <dt className="text-xs text-muted">{h.label}</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatSpecValue({ unit: h.spec!.unit, valueType: "Number" }, h.spec!.value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-6 text-xs text-muted">Profile last updated {formatDate(bike.updatedAt)}</p>
        </div>
      </header>

      {bike.isDemo && (
        <div className="mt-8">
          <DemoDataNotice />
        </div>
      )}

      <nav
        aria-label="On this page"
        className="sticky top-14 z-30 -mx-4 mt-10 border-y border-line bg-bg/95 px-4 backdrop-blur"
      >
        <ul className="flex gap-6 overflow-x-auto py-3 text-sm font-medium whitespace-nowrap">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-muted hover:text-fg">
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {bike.description && (
        <section className="mt-10 max-w-3xl" aria-labelledby="overview">
          <h2 id="overview" className="font-display text-2xl font-semibold">
            Overview
          </h2>
          <p className="mt-3 whitespace-pre-line text-muted">{bike.description}</p>
        </section>
      )}

      <section id="variants" className="mt-12 scroll-mt-28" aria-labelledby="variants-heading">
        <h2 id="variants-heading" className="font-display text-2xl font-semibold">
          Variants &amp; prices
        </h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[32rem] text-sm">
            <thead className="bg-surface-muted text-left">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  Variant
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Price
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Price type
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Effective
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {bike.variants.map((v) =>
                v.prices.length === 0 ? (
                  <tr key={v.id}>
                    <th scope="row" className="px-4 py-2.5 text-left font-semibold">
                      {v.name}
                      {v.modelYear && <span className="ml-1 font-normal text-muted">({v.modelYear})</span>}
                    </th>
                    <td colSpan={3} className="px-4 py-2.5 text-muted">
                      {bike.availabilityStatus === "Upcoming" ? "Not announced" : "Not available"}
                    </td>
                  </tr>
                ) : (
                  v.prices.map((p, i) => (
                    <tr key={`${v.id}-${i}`}>
                      <th scope="row" className="px-4 py-2.5 text-left font-semibold">
                        {i === 0 && (
                          <>
                            {v.name}
                            {v.modelYear && (
                              <span className="ml-1 font-normal text-muted">({v.modelYear})</span>
                            )}
                          </>
                        )}
                      </th>
                      <td className="px-4 py-2.5 tabular-nums">
                        {formatInr(p.amount)}
                        {p.regionCode && <span className="ml-1 text-muted">({p.regionCode})</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="flex flex-wrap items-center gap-2">
                          {priceTypeLabels[p.priceType]}
                          <ProvenanceBadge provenance={p.provenance} />
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted">{formatDate(p.effectiveFrom)}</td>
                    </tr>
                  ))
                ),
              )}
            </tbody>
          </table>
        </div>
        {hasPrices && (
          <p className="mt-2 text-xs text-muted">
            Ex-showroom prices exclude registration, insurance and other charges. On-road prices vary by state
            and city.
          </p>
        )}
      </section>

      <section id="specifications" className="mt-12 scroll-mt-28" aria-labelledby="specs-heading">
        <h2 id="specs-heading" className="font-display text-2xl font-semibold">
          Specifications
        </h2>
        {provenances.length === 1 ? (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            All values below: <ProvenanceBadge provenance={provenances[0]} />
            {provenanceLabels[provenances[0]].description}
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">Each value is labelled with where it came from.</p>
        )}
        <p className="mt-1 text-sm text-muted">
          A dash means the value is not known yet. MotoScope never fills gaps with guesses.
        </p>
        <div className="mt-6">
          {bike.specGroups.length > 0 ? (
            <SpecTables
              groups={bike.specGroups}
              variants={bike.variants}
              showCellProvenance={provenances.length > 1}
            />
          ) : (
            <p className="text-muted">No specifications have been confirmed for this model yet.</p>
          )}
        </div>
      </section>

      <section id="sources" className="mt-12 scroll-mt-28" aria-labelledby="sources-heading">
        <h2 id="sources-heading" className="font-display text-2xl font-semibold">
          Sources
        </h2>
        {bike.sources.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {bike.sources.map((s) => (
              <li key={s.id} className="rounded-lg border border-line bg-surface p-4 text-sm">
                <p className="font-semibold">
                  {s.url ? (
                    <a href={s.url} className="link" rel="noopener noreferrer nofollow" target="_blank">
                      {s.title ?? s.sourceName}
                    </a>
                  ) : (
                    (s.title ?? s.sourceName)
                  )}
                </p>
                <p className="mt-1 text-muted">
                  {s.sourceName} · {sourceTypeLabels[s.sourceType]} · retrieved {formatDate(s.retrievedAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-muted">No sources have been cited for this profile yet.</p>
        )}
        <p className="mt-4 text-sm text-muted">
          Spotted an error?{" "}
          <Link href="/editorial-policy" className="link">
            Read how we correct information
          </Link>
          .
        </p>
      </section>

      {bike.related.length > 0 && (
        <section id="related" className="mt-12 scroll-mt-28" aria-labelledby="related-heading">
          <h2 id="related-heading" className="font-display text-2xl font-semibold">
            Related motorcycles
          </h2>
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bike.related.map((r) => (
              <li key={r.id} className="flex">
                <MotorcycleCard bike={r} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
