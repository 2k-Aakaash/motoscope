import type { AvailabilityStatus, DataProvenance } from "@/lib/api/types";
import { availabilityLabels, provenanceLabels } from "@/lib/labels";

const base =
  "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] leading-4 font-semibold tracking-wide";

/** Marks illustrative demo/seed records wherever they appear. Never omit on demo data. */
export function DemoBadge() {
  return (
    <span className={`${base} bg-warn-bg text-warn-fg uppercase`} title={provenanceLabels.Demo.description}>
      Demo data
    </span>
  );
}

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  const tone =
    status === "Available"
      ? "bg-surface-muted text-fg"
      : status === "Upcoming"
        ? "bg-accent-soft text-accent-strong"
        : "bg-surface-muted text-muted line-through decoration-1";
  return <span className={`${base} ${tone}`}>{availabilityLabels[status]}</span>;
}

/** Small label explaining where a value came from. */
export function ProvenanceBadge({ provenance }: { provenance: DataProvenance }) {
  const { label, description } = provenanceLabels[provenance];
  const tone = provenance === "Demo" ? "bg-warn-bg text-warn-fg" : "bg-surface-muted text-muted";
  return (
    <span className={`${base} ${tone}`} title={description}>
      {label}
    </span>
  );
}
