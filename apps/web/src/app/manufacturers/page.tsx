import type { Metadata } from "next";
import Link from "next/link";
import { DemoBadge } from "@/components/badges";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Notice } from "@/components/notice";
import { listManufacturers } from "@/lib/data/catalogue";

export const metadata: Metadata = {
  title: "Motorcycle manufacturers",
  description:
    "Browse motorcycle manufacturers and their models, with specifications and sources for every profile.",
  alternates: { canonical: "/manufacturers" },
};

export default async function ManufacturersPage() {
  const manufacturers = await listManufacturers();
  const withModels = manufacturers.filter((m) => m.modelCount > 0);

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ label: "Manufacturers" }]} />
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight">Manufacturers</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Every manufacturer with at least one published motorcycle profile.
      </p>

      {withModels.length === 0 ? (
        <div className="mt-8">
          <Notice title="No manufacturers with published models yet" />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {withModels.map((m) => (
            <li key={m.id}>
              <Link
                href={`/manufacturers/${m.slug}`}
                className="flex h-full flex-col rounded-lg border border-line bg-surface p-5 hover:border-accent"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-lg font-semibold">{m.name}</span>
                  {m.isDemo && <DemoBadge />}
                </span>
                <span className="mt-1 text-sm text-muted">
                  {m.modelCount === 1 ? "1 model" : `${m.modelCount} models`}
                  {m.countryOfOrigin && ` · ${m.countryOfOrigin}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
