import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DemoBadge } from "@/components/badges";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MotorcycleCard } from "@/components/motorcycle-card";
import { DemoDataNotice, Notice } from "@/components/notice";
import { getManufacturer } from "@/lib/data/catalogue";

export async function generateMetadata(props: PageProps<"/manufacturers/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const manufacturer = await getManufacturer(slug);
  if (!manufacturer) return { title: "Manufacturer not found", robots: { index: false } };
  return {
    title: `${manufacturer.name} motorcycles — models, specs and prices`,
    description:
      manufacturer.description ??
      `All ${manufacturer.name} motorcycles on MotoScope with specifications and sources.`,
    alternates: { canonical: `/manufacturers/${manufacturer.slug}` },
    robots: manufacturer.isDemo ? { index: false, follow: true } : undefined,
  };
}

export default async function ManufacturerPage(props: PageProps<"/manufacturers/[slug]">) {
  const { slug } = await props.params;
  const manufacturer = await getManufacturer(slug);
  if (!manufacturer) notFound();

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[{ label: "Manufacturers", href: "/manufacturers" }, { label: manufacturer.name }]}
      />
      <header className="mt-4 max-w-3xl">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">{manufacturer.name}</h1>
          {manufacturer.isDemo && <DemoBadge />}
        </div>
        {manufacturer.countryOfOrigin && (
          <p className="mt-1 text-sm text-muted">{manufacturer.countryOfOrigin}</p>
        )}
        {manufacturer.description && <p className="mt-3 text-muted">{manufacturer.description}</p>}
        {manufacturer.websiteUrl && (
          <p className="mt-3 text-sm">
            <a
              href={manufacturer.websiteUrl}
              className="link"
              rel="noopener noreferrer nofollow"
              target="_blank"
            >
              Official website
            </a>
          </p>
        )}
      </header>

      {manufacturer.isDemo && (
        <div className="mt-6">
          <DemoDataNotice />
        </div>
      )}

      <section className="mt-10" aria-labelledby="models-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="models-heading" className="font-display text-2xl font-semibold">
            Models
          </h2>
          {manufacturer.models.length > 0 && (
            <Link href={`/motorcycles?manufacturer=${manufacturer.slug}`} className="link text-sm">
              Filter and sort in the catalogue
            </Link>
          )}
        </div>
        {manufacturer.models.length === 0 ? (
          <div className="mt-4">
            <Notice title="No published models yet" />
          </div>
        ) : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {manufacturer.models.map((bike) => (
              <li key={bike.id} className="flex">
                <MotorcycleCard bike={bike} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
