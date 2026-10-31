import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ListingPrice } from "@/components/listing-card";
import { MotorcyclePlaceholder } from "@/components/motorcycle-placeholder";
import { Notice } from "@/components/notice";
import { isCarapisConfigured } from "@/lib/carapis/config";
import { CarapisError } from "@/lib/carapis/errors";
import type { Vehicle } from "@/lib/carapis/normalize";
import { sourceName } from "@/lib/carapis/sources";
import { formatDate, formatNumber } from "@/lib/format";
import { vehicleIdSchema } from "@/lib/vehicles/query";
import { getVehicle, MARKETPLACE_NOTICE } from "@/lib/vehicles/service";

export const metadata: Metadata = {
  title: "Marketplace listing",
  robots: { index: false, follow: false },
};

function rows(v: Vehicle): { label: string; value: string }[] {
  const s = v.specifications;
  return [
    ["Year", v.year !== null ? String(v.year) : null],
    ["Engine", s.engineCc !== null ? `${formatNumber(s.engineCc, 0)} cc` : null],
    ["Fuel", s.fuelType],
    ["Transmission", s.transmission],
    ["Body type", s.bodyType],
    ["Odometer (as listed)", s.mileage !== null ? formatNumber(s.mileage, 0) : null],
    ["Seats", s.seatCount !== null ? String(s.seatCount) : null],
    ["Seller", v.sellerType],
    ["Region", v.location.region],
    ["Condition", v.isNewVehicle === null ? null : v.isNewVehicle ? "New" : "Used"],
    ["Still listed", v.isAvailable === null ? null : v.isAvailable ? "Yes" : "No"],
    ["First seen", v.firstSeenAt ? formatDate(v.firstSeenAt) : null],
    ["Last seen", v.lastSeenAt ? formatDate(v.lastSeenAt) : null],
  ]
    .filter((r): r is [string, string] => r[1] !== null)
    .map(([label, value]) => ({ label, value }));
}

export default async function ListingDetailPage(props: PageProps<"/listings/[id]">) {
  await connection();
  const { id } = await props.params;
  if (!vehicleIdSchema.safeParse(id).success) notFound();

  let vehicle: Vehicle | null = null;
  let problem: string | null = null;
  if (!isCarapisConfigured()) {
    problem = "The listings provider has not been configured for this site.";
  } else {
    try {
      vehicle = await getVehicle(id);
    } catch (error) {
      if (error instanceof CarapisError && error.code === "CARAPIS_NOT_FOUND") notFound();
      if (error instanceof CarapisError) problem = error.message;
      else throw error;
    }
  }

  const name = vehicle
    ? [vehicle.manufacturer, vehicle.model, vehicle.variant].filter(Boolean).join(" ") || "Unnamed listing"
    : "Marketplace listing";

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: "Marketplace listings", href: "/listings" }, { label: name }]} />
      {!vehicle ? (
        <div className="mt-6">
          <Notice tone="warning" title="This listing could not be loaded">
            {problem}
          </Notice>
        </div>
      ) : (
        <article className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-surface-muted">
            {vehicle.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- third-party marketplace image hosts
              <img
                src={vehicle.images[0]}
                alt={`${name} — listing photo`}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <MotorcyclePlaceholder label="No photo in listing" />
            )}
          </div>
          <div>
            <p className="text-sm text-muted">Marketplace listing via {sourceName(vehicle.source)}</p>
            <h1 className="font-display text-3xl font-bold tracking-tight">{name}</h1>
            <div className="mt-4 rounded-lg border border-line bg-surface p-4">
              <ListingPrice price={vehicle.price} />
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {rows(vehicle).map((r) => (
                <div key={r.label}>
                  <dt className="text-muted">{r.label}</dt>
                  <dd className="font-medium">{r.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-xs text-muted">{MARKETPLACE_NOTICE} Unknown values are left blank.</p>
            {vehicle.listingUrl && (
              <p className="mt-4">
                <a
                  href={vehicle.listingUrl}
                  className="btn-secondary"
                  rel="noopener noreferrer nofollow"
                  target="_blank"
                >
                  View the original listing on {sourceName(vehicle.source)}
                </a>
              </p>
            )}
          </div>
        </article>
      )}
    </div>
  );
}
