import { describe, expect, it } from "vitest";
import type {
  CatalogueFilters,
  ManufacturerDetail,
  ManufacturerSummary,
  MotorcycleCard,
  MotorcycleDetail,
  PagedResult,
  SitemapEntry,
} from "@/lib/api/types";
import { GET as manufacturersList } from "@/app/api/v1/manufacturers/route";
import { GET as manufacturerDetail } from "@/app/api/v1/manufacturers/[slug]/route";
import { GET as motorcyclesSearch } from "@/app/api/v1/motorcycles/route";
import { GET as motorcycleDetail } from "@/app/api/v1/motorcycles/[slug]/route";
import { GET as motorcycleFilters } from "@/app/api/v1/motorcycles/filters/route";
import { GET as sitemapEntries } from "@/app/api/v1/sitemap-entries/route";
import { GET as live } from "@/app/health/live/route";
import { GET as ready } from "@/app/health/ready/route";
import { call, hasDb, type Handler } from "./http";

const search = async (query: string) =>
  (await call<PagedResult<MotorcycleCard>>(motorcyclesSearch as Handler, `/api/v1/motorcycles?${query}`))
    .body;
const slugs = (r: PagedResult<MotorcycleCard>) => r.items.map((m) => m.slug);

describe.skipIf(!hasDb)("catalogue API (PostgreSQL)", () => {
  it("lists manufacturers with published-model counts", async () => {
    const { status, body } = await call<ManufacturerSummary[]>(
      manufacturersList as Handler,
      "/api/v1/manufacturers",
    );
    expect(status).toBe(200);
    expect(body.find((m) => m.slug === "kestrel-moto")?.modelCount).toBe(3); // draft prototype excluded
    expect(body.every((m) => m.isDemo)).toBe(true);
  });

  it("returns a manufacturer with its models", async () => {
    const { body } = await call<ManufacturerDetail>(
      manufacturerDetail as Handler,
      "/api/v1/manufacturers/vayu-electric",
      {
        params: { slug: "vayu-electric" },
      },
    );
    expect(body.models.map((m) => m.slug)).toEqual(["vayu-bolt-s", "vayu-pulse"]);
  });

  it("searches published models only", async () => {
    const result = await search("pageSize=48");
    expect(result.totalCount).toBe(8);
    expect(slugs(result)).not.toContain("kestrel-strix-690-prototype");
  });

  it("matches every term across model and manufacturer names", async () => {
    expect(slugs(await search("q=kestrel%20strix"))).toEqual(["kestrel-strix-390"]);
  });

  it("treats LIKE wildcards literally", async () => {
    expect((await search("q=%25")).totalCount).toBe(0);
    expect((await search("q=_")).totalCount).toBe(0);
  });

  it("filters by engine capacity and ABS", async () => {
    expect(slugs(await search("minCc=300&maxCc=500&abs=Dual-channel&sort=engine-asc"))).toEqual([
      "arka-heritage-350",
      "kestrel-strix-390",
      "kestrel-trailhawk-450",
    ]);
  });

  it("filters by fuel and price", async () => {
    expect(slugs(await search("fuel=Electric&maxPrice=160000"))).toEqual(["vayu-pulse"]);
  });

  it("filters by category, status and ergonomics", async () => {
    expect(slugs(await search("category=Naked&status=Available"))).toEqual([
      "kestrel-strix-390",
      "vayu-bolt-s",
    ]);
    expect(slugs(await search("maxSeatHeight=800&maxWeight=150"))).toEqual([
      "arka-sprint-125",
      "vayu-bolt-s",
      "vayu-pulse",
    ]);
    expect(slugs(await search("transmission=Single-speed"))).toEqual(["vayu-bolt-s", "vayu-pulse"]);
  });

  it("sorts unknown prices last in both directions", async () => {
    for (const sort of ["price-asc", "price-desc"]) {
      const items = (await search(`sort=${sort}`)).items;
      const firstUnknown = items.findIndex((m) => m.startingPrice === null);
      expect(firstUnknown).toBeGreaterThan(0);
      expect(items.slice(firstUnknown).every((m) => m.startingPrice === null)).toBe(true);
    }
    expect((await search("sort=price-asc")).items[0].slug).toBe("arka-sprint-125");
    const desc = (await search("sort=price-desc")).items
      .filter((m) => m.startingPrice)
      .map((m) => m.startingPrice!.amount);
    expect(desc).toEqual([...desc].sort((a, b) => b - a));
  });

  it("builds cards from the base variant with a labelled lowest price", async () => {
    const [card] = (await search("q=sprint")).items;
    expect(card.displacementCc).toBe(124.6);
    expect(card.startingPrice).toMatchObject({
      variantName: "Drum",
      amount: 92000,
      priceType: "Illustrative",
    });
  });

  it("returns consistent pagination metadata", async () => {
    const page2 = await search("page=2&pageSize=3");
    expect(page2).toMatchObject({ page: 2, totalPages: 3, hasNextPage: true, hasPreviousPage: true });
    expect(page2.items).toHaveLength(3);
  });

  it("returns validation Problem Details for invalid queries", async () => {
    const { status, headers, body } = await call(
      motorcyclesSearch as Handler,
      "/api/v1/motorcycles?sort=bogus&pageSize=500",
    );
    expect(status).toBe(400);
    expect(headers.get("content-type")).toContain("application/problem+json");
    expect(Object.keys(body.errors).sort()).toEqual(["pageSize", "sort"]);
    expect(body.traceId).toBeTruthy();
    expect(body.correlationId).toBeTruthy();
    expect(
      (await call(motorcyclesSearch as Handler, "/api/v1/motorcycles?category=Spaceship")).body.errors,
    ).toHaveProperty("category");
  });

  it("returns variant-aligned specs with provenance, sources and related models", async () => {
    const { body } = await call<MotorcycleDetail>(
      motorcycleDetail as Handler,
      "/api/v1/motorcycles/kestrel-strix-390",
      {
        params: { slug: "kestrel-strix-390" },
      },
    );
    expect(body.variants.map((v) => v.name)).toEqual(["Standard", "Track"]);
    const rows = body.specGroups.flatMap((g) => g.specs);
    const abs = rows.find((s) => s.key === "abs")!;
    expect(abs.values.map((v) => v?.text)).toEqual(["Dual-channel", "Cornering"]);
    expect(abs.values.every((v) => v?.provenance === "Demo")).toBe(true);
    expect(rows.find((s) => s.key === "ride_modes")!.values[0]).toBeNull(); // unknown, never invented
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0].sourceType).toBe("Demo");
    expect(body.related.length).toBeGreaterThan(0);
    expect(body.related.map((r) => r.slug)).not.toContain(body.slug);
    expect(body.specGroups.map((g) => g.group)).toEqual([
      "Engine",
      "Performance",
      "Transmission",
      "Dimensions",
      "Brakes",
      "Suspension",
      "WheelsAndTyres",
      "Features",
      "Economy",
    ]);
  });

  it("returns an upcoming model without a price and only its known specs", async () => {
    const { body } = await call<MotorcycleDetail>(
      motorcycleDetail as Handler,
      "/api/v1/motorcycles/arka-roadstar-160",
      {
        params: { slug: "arka-roadstar-160" },
      },
    );
    expect(body.variants[0].prices).toEqual([]);
    expect(body.specGroups.reduce((n, g) => n + g.specs.length, 0)).toBe(3);
  });

  it.each([
    [motorcycleDetail, "/api/v1/motorcycles/does-not-exist", "does-not-exist"],
    [motorcycleDetail, "/api/v1/motorcycles/kestrel-strix-690-prototype", "kestrel-strix-690-prototype"],
    [manufacturerDetail, "/api/v1/manufacturers/does-not-exist", "does-not-exist"],
  ])("returns 404 Problem Details for %s", async (handler, path, slug) => {
    const { status, headers, body } = await call(handler as Handler, path, { params: { slug } });
    expect(status).toBe(404);
    expect(body.traceId).toBeTruthy();
    expect(headers.get("X-Correlation-ID")).toBeTruthy();
  });

  it("reports filter ranges from published data", async () => {
    const { body } = await call<CatalogueFilters>(
      motorcycleFilters as Handler,
      "/api/v1/motorcycles/filters",
    );
    expect(body.price).toEqual({ min: 92000, max: 335000 });
    expect(body.displacementCc).toEqual({ min: 124.6, max: 451 }); // 690cc draft excluded
    expect(body.manufacturers.map((m) => m.count)).toEqual([3, 3, 2]);
    expect(body.categories.map((c) => c.value)).toEqual(["Commuter", "Naked", "Sport", "Adventure", "Retro"]);
  });

  it("lists only published content for the sitemap", async () => {
    const { body } = await call<SitemapEntry[]>(sitemapEntries as Handler, "/api/v1/sitemap-entries");
    expect(body.filter((e) => e.type === "motorcycle")).toHaveLength(8);
    expect(body.filter((e) => e.type === "manufacturer")).toHaveLength(3);
    expect(body.some((e) => e.slug.includes("prototype"))).toBe(false);
  });

  it("reports health", async () => {
    expect((await live()).status).toBe(200);
    expect((await ready()).status).toBe(200);
  });
});
