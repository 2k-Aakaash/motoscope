import type { Metadata } from "next";
import { ProsePage } from "@/components/content/prose-page";
import { provenanceLabels, priceTypeLabels } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Data sources and methodology",
  description: "Where MotoScope data comes from, how values are labelled, and the limits of what we publish.",
  alternates: { canonical: "/data-sources" },
};

export default function DataSourcesPage() {
  return (
    <ProsePage
      title="Data sources and methodology"
      intro="Every figure on MotoScope should be traceable. This page explains how we label data and what we will not do."
    >
      <h2>How values are labelled</h2>
      <ul>
        {Object.entries(provenanceLabels).map(([key, { label, description }]) => (
          <li key={key}>
            <strong>{label}:</strong> {description}
          </li>
        ))}
      </ul>
      <p>Where a source exists, the profile lists it with the date it was retrieved.</p>

      <h2>Prices</h2>
      <ul>
        {Object.entries(priceTypeLabels).map(([key, label]) => (
          <li key={key}>{label}</li>
        ))}
      </ul>
      <p>
        Each price states its type, region (if regional) and effective date. An estimated price is never shown
        as an ex-showroom or on-road price. Prices are indicative and are not quotes.
      </p>

      <h2>Units</h2>
      <p>
        Values are stored in one canonical unit each — kilowatts for power, newton-metres for torque,
        millimetres, kilograms, litres, km/l — and converted for display. Power is shown in kW with the
        equivalent metric horsepower (1 kW = 1.35962 PS).
      </p>

      <h2>What we will not do</h2>
      <ul>
        <li>Fill unknown specifications with guesses. Missing values are shown as gaps.</li>
        <li>Publish invented ratings, review counts, popularity claims or statistics.</li>
        <li>Turn a number of owner reports into a failure rate without a valid denominator and method.</li>
        <li>Copy articles from other publications. We link to sources and write our own short summaries.</li>
      </ul>

      <h2>Demo data</h2>
      <p>
        Development and demonstration environments use a small dataset of fictional manufacturers. Those
        records are marked “Demo data” everywhere they appear and are never loaded into production.
      </p>
    </ProsePage>
  );
}
