import type { DataProvenance, MotorcycleDetail, Price, SpecValue } from "@/lib/api/types";

/** Value for a spec key on the base variant, falling back to the first variant that has one. */
export function keySpec(
  detail: MotorcycleDetail,
  key: string,
): { value: SpecValue; unit: string | null } | null {
  const row = detail.specGroups.flatMap((g) => g.specs).find((s) => s.key === key);
  if (!row) return null;
  const baseIndex = Math.max(
    0,
    detail.variants.findIndex((v) => v.isBase),
  );
  const value = row.values[baseIndex] ?? row.values.find((v) => v !== null) ?? null;
  return value ? { value, unit: row.unit } : null;
}

/** Lowest current market-wide (no region) price across variants, with the variant it belongs to. */
export function startingPrice(detail: MotorcycleDetail): { price: Price; variantName: string } | null {
  let best: { price: Price; variantName: string } | null = null;
  for (const variant of detail.variants) {
    for (const price of variant.prices) {
      if (price.regionCode !== null) continue;
      if (!best || price.amount < best.price.amount) best = { price, variantName: variant.name };
    }
  }
  return best;
}

/** Distinct provenances used by the page's specification values. */
export function specProvenances(detail: MotorcycleDetail): DataProvenance[] {
  const set = new Set<DataProvenance>();
  for (const group of detail.specGroups)
    for (const row of group.specs) for (const v of row.values) if (v) set.add(v.provenance);
  return [...set];
}
