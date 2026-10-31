import Link from "next/link";
import type { CatalogueFilters } from "@/lib/api/types";
import type { CatalogueParams } from "@/lib/catalogue-query";
import { formatInrCompact, formatNumber } from "@/lib/format";
import { availabilityLabels, categoryLabels, labelFor } from "@/lib/labels";

export const FILTER_FORM_ID = "catalogue-filters";

function CheckboxGroup({
  legend,
  name,
  options,
  selected,
}: {
  legend: string;
  name: string;
  options: { value: string; label: string; count?: number }[];
  selected: string[];
}) {
  if (options.length === 0) return null;
  return (
    <fieldset className="border-t border-line pt-4">
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="space-y-1.5">
        {options.map((o) => {
          const id = `f-${name}-${o.value}`;
          return (
            <div key={o.value} className="flex items-center gap-2 text-sm">
              <input
                id={id}
                type="checkbox"
                name={name}
                value={o.value}
                defaultChecked={selected.includes(o.value)}
                className="size-4 accent-[var(--accent)]"
              />
              <label htmlFor={id} className="flex-1">
                {o.label}
              </label>
              {o.count !== undefined && <span className="text-xs text-muted tabular-nums">{o.count}</span>}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

function RangeInputs({
  legend,
  hint,
  min,
  max,
}: {
  legend: string;
  hint?: string;
  min?: { name: string; value: number | null; placeholder?: string };
  max?: { name: string; value: number | null; placeholder?: string };
}) {
  return (
    <fieldset className="border-t border-line pt-4">
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      <div className="flex gap-2">
        {[min && { ...min, label: "Minimum" }, max && { ...max, label: "Maximum" }]
          .filter((f) => !!f)
          .map((f) => (
            <div key={f.name} className="flex-1">
              <label htmlFor={`f-${f.name}`} className="text-xs text-muted">
                {f.label}
              </label>
              <input
                id={`f-${f.name}`}
                name={f.name}
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={f.value ?? undefined}
                placeholder={f.placeholder}
                className="input mt-1 py-1.5"
              />
            </div>
          ))}
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </fieldset>
  );
}

/** Server-rendered GET form: every filter becomes a shareable query parameter. */
export function FilterPanel({ params, filters }: { params: CatalogueParams; filters: CatalogueFilters }) {
  return (
    <form
      id={FILTER_FORM_ID}
      action="/motorcycles"
      method="get"
      className="space-y-4"
      aria-label="Filter motorcycles"
    >
      <div>
        <label htmlFor="f-q" className="mb-2 block text-sm font-semibold">
          Search
        </label>
        <input
          id="f-q"
          name="q"
          type="search"
          defaultValue={params.q ?? ""}
          placeholder="Model or manufacturer"
          maxLength={100}
          className="input"
        />
      </div>

      <CheckboxGroup
        legend="Manufacturer"
        name="manufacturer"
        options={filters.manufacturers}
        selected={params.manufacturer}
      />
      <CheckboxGroup
        legend="Category"
        name="category"
        options={filters.categories.map((c) => ({ ...c, label: labelFor(categoryLabels, c.value) }))}
        selected={params.category}
      />
      <RangeInputs
        legend="Price (₹)"
        hint={
          filters.price
            ? `Listed prices range ${formatInrCompact(filters.price.min)}–${formatInrCompact(filters.price.max)}`
            : undefined
        }
        min={{ name: "minPrice", value: params.minPrice, placeholder: "Any" }}
        max={{ name: "maxPrice", value: params.maxPrice, placeholder: "Any" }}
      />
      <RangeInputs
        legend="Engine capacity (cc)"
        hint={
          filters.displacementCc
            ? `${formatNumber(filters.displacementCc.min)}–${formatNumber(filters.displacementCc.max)} cc listed. Electric models have no engine capacity.`
            : undefined
        }
        min={{ name: "minCc", value: params.minCc, placeholder: "Any" }}
        max={{ name: "maxCc", value: params.maxCc, placeholder: "Any" }}
      />
      <CheckboxGroup
        legend="Fuel"
        name="fuel"
        options={filters.fuelTypes.map((v) => ({ value: v, label: v }))}
        selected={params.fuel}
      />
      <CheckboxGroup
        legend="Transmission"
        name="transmission"
        options={filters.transmissions.map((v) => ({ value: v, label: v }))}
        selected={params.transmission}
      />
      <CheckboxGroup
        legend="ABS"
        name="abs"
        options={filters.absOptions.map((v) => ({ value: v, label: v }))}
        selected={params.abs}
      />
      <RangeInputs
        legend="Seat height (mm)"
        max={{ name: "maxSeatHeight", value: params.maxSeatHeight, placeholder: "e.g. 800" }}
      />
      <RangeInputs
        legend="Kerb weight (kg)"
        max={{ name: "maxWeight", value: params.maxWeight, placeholder: "e.g. 180" }}
      />
      <CheckboxGroup
        legend="Availability"
        name="status"
        options={filters.availabilityStatuses.map((s) => ({
          ...s,
          label: labelFor(availabilityLabels, s.value),
        }))}
        selected={params.status}
      />
      <RangeInputs
        legend="Launch year"
        min={{
          name: "yearFrom",
          value: params.yearFrom,
          placeholder: filters.launchYear ? String(filters.launchYear.min) : "From",
        }}
        max={{
          name: "yearTo",
          value: params.yearTo,
          placeholder: filters.launchYear ? String(filters.launchYear.max) : "To",
        }}
      />

      <div className="sticky bottom-0 flex gap-2 border-t border-line bg-bg py-3">
        <button type="submit" className="btn-primary flex-1">
          Apply filters
        </button>
        <Link href="/motorcycles" className="btn-secondary">
          Reset
        </Link>
      </div>
    </form>
  );
}
