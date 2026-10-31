import type { SpecGroupData, SpecRow, SpecValue, Variant } from "@/lib/api/types";
import { formatSpecValue } from "@/lib/format";
import { specGroupLabels } from "@/lib/labels";
import { ProvenanceBadge } from "../badges";

function cellText(row: SpecRow, value: SpecValue | null): string | null {
  return value ? formatSpecValue(row, value) : null;
}

function UnknownValue() {
  return (
    <span className="text-muted">
      <span aria-hidden="true">—</span>
      <span className="sr-only">Not available</span>
    </span>
  );
}

const groupNotes: Partial<Record<SpecGroupData["group"], string>> = {
  Economy:
    "Claimed mileage is the manufacturer's test-cycle figure. Real-world economy depends on riding and conditions; owner-reported figures will be shown separately once collected.",
  Battery:
    "Claimed range is measured under the manufacturer's test conditions. Real-world range is usually lower.",
};

/**
 * Specification tables grouped by area. With several variants, each variant gets a column and rows whose values
 * differ between variants are marked. Provenance is shown per cell only when values come from mixed provenance.
 */
export function SpecTables({
  groups,
  variants,
  showCellProvenance,
}: {
  groups: SpecGroupData[];
  variants: Variant[];
  showCellProvenance: boolean;
}) {
  const multi = variants.length > 1;

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.group} aria-labelledby={`spec-${group.group}`}>
          <h3 id={`spec-${group.group}`} className="font-display text-lg font-semibold">
            {specGroupLabels[group.group]}
          </h3>
          {groupNotes[group.group] && (
            <p className="mt-1 max-w-2xl text-sm text-muted">{groupNotes[group.group]}</p>
          )}
          <div className="mt-3 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[28rem] text-sm">
              {multi && (
                <thead className="bg-surface-muted text-left">
                  <tr>
                    <th scope="col" className="w-1/3 px-4 py-2 font-medium text-muted">
                      Specification
                    </th>
                    {variants.map((v) => (
                      <th key={v.id} scope="col" className="px-4 py-2 font-semibold">
                        {v.name}
                      </th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody className="divide-y divide-line">
                {group.specs.map((row) => {
                  const texts = row.values.map((v) => cellText(row, v));
                  const differs = multi && new Set(texts).size > 1;
                  return (
                    <tr key={row.key} className={differs ? "bg-accent-soft/60" : undefined}>
                      <th scope="row" className="w-1/3 px-4 py-2.5 text-left font-normal text-muted">
                        {row.label}
                        {differs && (
                          <span className="ml-2 text-[11px] font-semibold text-accent-strong uppercase">
                            Differs
                          </span>
                        )}
                      </th>
                      {row.values.map((value, i) => (
                        <td key={variants[i]?.id ?? i} className="px-4 py-2.5 align-top">
                          {value ? (
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="tabular-nums">{texts[i]}</span>
                              {showCellProvenance && <ProvenanceBadge provenance={value.provenance} />}
                            </span>
                          ) : (
                            <UnknownValue />
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
