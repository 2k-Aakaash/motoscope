import type { PriceType } from "@/lib/api/types";
import { formatInr } from "@/lib/format";
import { priceTypeLabels } from "@/lib/labels";

/** An amount is always shown with its price type so an estimate is never mistaken for an official price. */
export function PriceTag({
  amount,
  priceType,
  prefix,
  size = "md",
}: {
  amount: number;
  priceType: PriceType;
  prefix?: string;
  size?: "md" | "lg";
}) {
  return (
    <span className="inline-flex flex-col">
      <span className={size === "lg" ? "text-2xl font-semibold tabular-nums" : "font-semibold tabular-nums"}>
        {prefix && <span className="mr-1 text-sm font-normal text-muted">{prefix}</span>}
        {formatInr(amount)}
      </span>
      <span className="text-xs text-muted">{priceTypeLabels[priceType]}</span>
    </span>
  );
}

export function PriceUnavailable({ upcoming }: { upcoming?: boolean }) {
  return (
    <span className="text-sm text-muted">{upcoming ? "Price not announced" : "Price not available"}</span>
  );
}
