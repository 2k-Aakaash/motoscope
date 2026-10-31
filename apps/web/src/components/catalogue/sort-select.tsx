"use client";

import { sortOptions, type SortKey } from "@/lib/catalogue-query";

/**
 * Sort control for the catalogue. It belongs to a plain GET form, so it works without JavaScript
 * (via the Apply button); with JavaScript the form submits as soon as the selection changes.
 */
export function SortSelect({ value, formId }: { value: SortKey; formId: string }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm text-muted">
        Sort by
      </label>
      <select
        id="sort"
        name="sort"
        form={formId}
        defaultValue={value}
        className="input w-auto py-1.5"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
