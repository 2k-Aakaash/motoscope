import type { MarketplaceVehicle } from "@/lib/carapis/normalize";
import { formatMoney, formatNumber } from "@/lib/format";
import { MotorcyclePlaceholder } from "./motorcycle-placeholder";

/** A third-party marketplace listing. Labelled as such: never presented as official specifications or prices. */
export function ListingCard({ vehicle, sourceName }: { vehicle: MarketplaceVehicle; sourceName: string }) {
  const facts = [
    vehicle.year !== null ? { label: "Year", value: String(vehicle.year) } : null,
    vehicle.fuelType ? { label: "Fuel", value: vehicle.fuelType } : null,
    vehicle.transmission ? { label: "Transmission", value: vehicle.transmission } : null,
    vehicle.odometer !== null
      ? { label: "Odometer (as listed)", value: formatNumber(vehicle.odometer, 0) }
      : null,
    vehicle.location ? { label: "Location", value: vehicle.location } : null,
  ].filter((f) => f !== null);

  return (
    <article className="flex w-full flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <div className="relative aspect-[16/10] bg-surface-muted">
        {vehicle.images[0] ? (
          // Third-party listing photos come from arbitrary marketplace hosts, so next/image allow-listing does not apply.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vehicle.images[0]}
            alt={vehicle.name ? `${vehicle.name} — listing photo` : "Listing photo"}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <MotorcyclePlaceholder label="No photo in listing" />
        )}
        <span className="absolute top-2 left-2 rounded bg-surface/90 px-1.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase">
          Marketplace listing
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs text-muted">via {sourceName}</p>
          <h2 className="font-display text-lg leading-snug font-semibold">
            {vehicle.name ?? "Unnamed listing"}
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
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-line pt-3">
          {vehicle.price ? (
            <span className="flex flex-col">
              <span className="font-semibold tabular-nums">
                {formatMoney(vehicle.price.amount, vehicle.price.currency)}
              </span>
              <span className="text-xs text-muted">Seller&apos;s asking price</span>
            </span>
          ) : (
            <span className="text-sm text-muted">No price in listing</span>
          )}
          {vehicle.sourceUrl && (
            <a
              href={vehicle.sourceUrl}
              className="link text-sm"
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              View original
            </a>
          )}
        </div>
      </div>
    </article>
  );
}
