import Link from "next/link";
import type { Vehicle } from "@/lib/carapis/normalize";
import { sourceName } from "@/lib/carapis/sources";
import { formatMoney, formatNumber } from "@/lib/format";
import { MotorcyclePlaceholder } from "./motorcycle-placeholder";

export function ListingPrice({ price }: { price: Vehicle["price"] }) {
  if (price.amount === null || price.currency === null) {
    return <span className="text-sm text-muted">No price in listing</span>;
  }
  return (
    <span className="flex flex-col">
      <span className="font-semibold tabular-nums">{formatMoney(price.amount, price.currency)}</span>
      <span className="text-xs text-muted">Seller&apos;s asking price</span>
    </span>
  );
}

/** A third-party marketplace listing. Labelled as such: never presented as official specifications or prices. */
export function ListingCard({ vehicle }: { vehicle: Vehicle }) {
  const name =
    [vehicle.manufacturer, vehicle.model, vehicle.variant].filter(Boolean).join(" ") || "Unnamed listing";
  const facts = [
    vehicle.year !== null ? { label: "Year", value: String(vehicle.year) } : null,
    vehicle.specifications.fuelType ? { label: "Fuel", value: vehicle.specifications.fuelType } : null,
    vehicle.specifications.transmission
      ? { label: "Transmission", value: vehicle.specifications.transmission }
      : null,
    vehicle.specifications.mileage !== null
      ? { label: "Odometer (as listed)", value: formatNumber(vehicle.specifications.mileage, 0) }
      : null,
    vehicle.location.region ? { label: "Region", value: vehicle.location.region } : null,
  ].filter((f) => f !== null);

  return (
    <article className="relative flex w-full flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <div className="relative aspect-[16/10] bg-surface-muted">
        {vehicle.images[0] ? (
          // Third-party listing photos come from arbitrary marketplace hosts, so next/image allow-listing does not apply.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicle.images[0]}
            alt={`${name} — listing photo`}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <MotorcyclePlaceholder label="No photo in listing" />
        )}
        <span className="absolute top-2 left-2 rounded bg-surface/90 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
          {vehicle.isNewVehicle === true ? "New · marketplace listing" : "Marketplace listing"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs text-muted">via {sourceName(vehicle.source)}</p>
          <h2 className="font-display text-lg leading-snug font-semibold">
            <Link href={`/listings/${vehicle.id}`} className="after:absolute after:inset-0">
              {name}
            </Link>
          </h2>
        </div>
        {facts.length > 0 && (
          <dl className="grid gap-1 text-sm">
            {facts.map((f) => (
              <div key={f.label} className="flex justify-between gap-3">
                <dt className="text-muted">{f.label}</dt>
                <dd className="text-right">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="mt-auto border-t border-line pt-3">
          <ListingPrice price={vehicle.price} />
        </div>
      </div>
    </article>
  );
}
