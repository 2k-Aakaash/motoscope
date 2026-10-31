import Image from "next/image";
import Link from "next/link";
import type { MotorcycleCard as Card } from "@/lib/api/types";
import { formatNumber, formatPower } from "@/lib/format";
import { categoryLabels } from "@/lib/labels";
import { AvailabilityBadge, DemoBadge } from "./badges";
import { MotorcyclePlaceholder } from "./motorcycle-placeholder";
import { PriceTag, PriceUnavailable } from "./price";

export function MotorcycleCard({ bike, headingLevel = 3 }: { bike: Card; headingLevel?: 2 | 3 }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const href = `/motorcycles/${bike.slug}`;
  const specs = [
    bike.displacementCc !== null
      ? { label: "Engine", value: `${formatNumber(bike.displacementCc)} cc` }
      : null,
    bike.maxPowerKw !== null ? { label: "Power", value: formatPower(bike.maxPowerKw) } : null,
    bike.maxTorqueNm !== null ? { label: "Torque", value: `${formatNumber(bike.maxTorqueNm)} Nm` } : null,
  ].filter((s) => s !== null);

  return (
    <article className="group relative flex w-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-shadow hover:shadow-md">
      <div className="relative aspect-[16/10] bg-surface-muted">
        {bike.image ? (
          <Image
            src={bike.image.url}
            alt={bike.image.altText}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <MotorcyclePlaceholder />
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {bike.isDemo && <DemoBadge />}
          {bike.availabilityStatus !== "Available" && <AvailabilityBadge status={bike.availabilityStatus} />}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs text-muted">
            {categoryLabels[bike.category]}
            {bike.fuelType === "Electric" && " · Electric"}
          </p>
          <Heading className="font-display text-lg leading-snug font-semibold">
            {/* The stretched link makes the whole card clickable while keeping one accessible link. */}
            <Link href={href} className="after:absolute after:inset-0 focus-visible:outline-none">
              {bike.manufacturer.name} {bike.name}
            </Link>
          </Heading>
        </div>

        {specs.length > 0 ? (
          <dl className="grid grid-cols-1 gap-1 text-sm">
            {specs.map((s) => (
              <div key={s.label} className="flex justify-between gap-3">
                <dt className="text-muted">{s.label}</dt>
                <dd className="text-right tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted">Key specifications not yet confirmed.</p>
        )}

        <div className="mt-auto border-t border-line pt-3">
          {bike.startingPrice ? (
            <PriceTag
              amount={bike.startingPrice.amount}
              priceType={bike.startingPrice.priceType}
              prefix="From"
            />
          ) : (
            <PriceUnavailable upcoming={bike.availabilityStatus === "Upcoming"} />
          )}
        </div>
      </div>
    </article>
  );
}
