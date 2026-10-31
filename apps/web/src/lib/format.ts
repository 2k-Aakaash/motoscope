import type { SpecRow, SpecValue } from "@/lib/api/types";

const LOCALE = "en-IN";

/** 1 kW = 1.35962 metric horsepower (PS). */
export const PS_PER_KW = 1.35962;

const inr = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** ₹3,10,000 — Indian digit grouping, no paise. */
export function formatInr(amount: number): string {
  return inr.format(amount);
}

/** ₹3.1 lakh / ₹1.25 crore / ₹92,000 — compact form for summaries and filter hints. */
export function formatInrCompact(amount: number): string {
  if (amount >= 1e7) return `₹${formatNumber(amount / 1e7, 2)} crore`;
  if (amount >= 1e5) return `₹${formatNumber(amount / 1e5, 2)} lakh`;
  return formatInr(amount);
}

export function formatNumber(value: number, maxFractionDigits = 1): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: maxFractionDigits }).format(value);
}

export function kwToPs(kw: number): number {
  return kw * PS_PER_KW;
}

/** "32 kW (43.5 PS)" — stored canonically in kW, shown with the PS figure Indian buyers expect. */
export function formatPower(kw: number): string {
  return `${formatNumber(kw)} kW (${formatNumber(kwToPs(kw))} PS)`;
}

export function formatWithUnit(value: number, unit: string | null): string {
  if (!unit) return formatNumber(value, 2);
  if (unit === "kW") return formatPower(value);
  return `${formatNumber(value, 2)} ${unit}`;
}

/** Human-readable value of one specification cell. Unknown values must be rendered by the caller, never guessed. */
export function formatSpecValue(row: Pick<SpecRow, "unit" | "valueType">, value: SpecValue): string {
  if (value.boolean !== null) return value.boolean ? "Yes" : "No";
  if (value.number !== null) return formatWithUnit(value.number, row.unit);
  return value.text ?? "";
}

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Dates are stored in UTC and shown as calendar dates (31 Oct 2026). */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** Formats an amount in its own ISO currency (no conversion). Falls back to "123,456 XYZ" for unknown codes. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(LOCALE, { style: "currency", currency, maximumFractionDigits: 0 }).format(
      amount,
    );
  } catch {
    return `${formatNumber(amount, 0)} ${currency}`;
  }
}
