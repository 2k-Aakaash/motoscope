import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import type {
  CatalogueFilters,
  Citation,
  ManufacturerDetail,
  ManufacturerSummary,
  MotorcycleCard,
  MotorcycleDetail,
  PagedResult,
  Price,
  SitemapEntry,
  SpecGroupData,
  SpecRow,
  SpecValue,
} from "@/lib/api/types";
import { db } from "@/lib/db";
import {
  dataSources,
  manufacturers,
  markets,
  modelImages,
  motorcycleModels as m,
  motorcycleVariants,
  sourceCitations,
  specificationDefinitions,
  variantPrices,
  variantSpecifications,
} from "@/lib/db/schema";
import { availabilityStatuses, specGroups, vehicleCategories } from "@/lib/domain/catalogue/enums";
import { AbsOptions, FuelTypes, SpecKeys, Transmissions } from "@/lib/domain/catalogue/spec-keys";
import { NotFoundError } from "@/lib/http/errors";
import { containsPattern, searchTerms } from "@/lib/utils/text";
import type { MotorcycleSearch } from "@/lib/validation/catalogue";

const RELATED_LIMIT = 4;
const CARD_SPEC_KEYS = [
  SpecKeys.DisplacementCc,
  SpecKeys.MaxPowerKw,
  SpecKeys.MaxTorqueNm,
  SpecKeys.FuelType,
];

/** Published, non-archived models of non-archived manufacturers. */
const visible = and(
  eq(m.publicationStatus, "Published"),
  isNull(m.deletedAt),
  isNull(manufacturers.deletedAt),
)!;

export function paged<T>(items: T[], page: number, pageSize: number, totalCount: number): PagedResult<T> {
  const totalPages = pageSize === 0 ? 0 : Math.ceil(totalCount / pageSize);
  return {
    items,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

// ------------------------------------------------------------------------------------------- manufacturers

/**
 * Correlated subqueries reference the outer row by its explicit table name: Drizzle omits table qualifiers in
 * single-table selects, so an interpolated `${table.id}` could silently bind to the subquery's own `id` column.
 */

/** Correlated count of a manufacturer's published, non-archived models. */
const publishedModelCount = sql<number>`(
  select count(*)::int from motorcycle_models pm
  where pm.manufacturer_id = "manufacturers"."id" and pm.publication_status = 'Published' and pm.deleted_at is null)`;

export async function listManufacturers(): Promise<ManufacturerSummary[]> {
  return db()
    .select({
      id: manufacturers.id,
      slug: manufacturers.slug,
      name: manufacturers.name,
      countryOfOrigin: manufacturers.countryOfOrigin,
      modelCount: publishedModelCount,
      isDemo: manufacturers.isDemo,
      updatedAt: manufacturers.updatedAt,
    })
    .from(manufacturers)
    .where(isNull(manufacturers.deletedAt))
    .orderBy(asc(manufacturers.name))
    .then((rows) => rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })));
}

export async function getManufacturer(slug: string, market: string): Promise<ManufacturerDetail> {
  const [manufacturer] = await db()
    .select()
    .from(manufacturers)
    .where(and(eq(manufacturers.slug, slug), isNull(manufacturers.deletedAt)));
  if (!manufacturer) throw new NotFoundError("Manufacturer", slug);

  const ids = await db()
    .select({ id: m.id })
    .from(m)
    .innerJoin(manufacturers, eq(manufacturers.id, m.manufacturerId))
    .where(and(visible, eq(m.manufacturerId, manufacturer.id)))
    .orderBy(asc(m.name));

  return {
    id: manufacturer.id,
    slug: manufacturer.slug,
    name: manufacturer.name,
    countryOfOrigin: manufacturer.countryOfOrigin,
    websiteUrl: manufacturer.websiteUrl,
    description: manufacturer.description,
    isDemo: manufacturer.isDemo,
    updatedAt: manufacturer.updatedAt.toISOString(),
    models: await loadCards(
      ids.map((r) => r.id),
      market,
    ),
  };
}

// ------------------------------------------------------------------------------------------------ search

/** Any non-archived variant of the model has a value for `key` within [min, max]. */
function numericSpecInRange(key: string, min?: number, max?: number): SQL {
  return sql`exists (
    select 1 from variant_specifications s
    join motorcycle_variants v on v.id = s.variant_id
    join specification_definitions d on d.id = s.definition_id
    where v.model_id = "motorcycle_models"."id" and v.deleted_at is null and d.key = ${key}
    ${min !== undefined ? sql`and s.numeric_value >= ${min}` : sql``}
    ${max !== undefined ? sql`and s.numeric_value <= ${max}` : sql``})`;
}

/** Any non-archived variant of the model has a text value for `key` in `values`. */
function textSpecIn(key: string, values: string[]): SQL {
  return sql`exists (
    select 1 from variant_specifications s
    join motorcycle_variants v on v.id = s.variant_id
    join specification_definitions d on d.id = s.definition_id
    where v.model_id = "motorcycle_models"."id" and v.deleted_at is null and d.key = ${key}
      and s.text_value in ${values})`;
}

/** Lowest current market-wide price of the model's variants (null when none). */
function startingPriceExpr(market: string): SQL {
  return sql`(
    select min(p.amount) from variant_prices p
    join motorcycle_variants v on v.id = p.variant_id
    join markets mk on mk.id = p.market_id
    where v.model_id = "motorcycle_models"."id" and v.deleted_at is null and p.is_current and p.region_code is null and mk.code = ${market})`;
}

/** Largest displacement across the model's variants (null when unknown). */
const maxDisplacementExpr = sql`(
  select max(s.numeric_value) from variant_specifications s
  join motorcycle_variants v on v.id = s.variant_id
  join specification_definitions d on d.id = s.definition_id
  where v.model_id = "motorcycle_models"."id" and v.deleted_at is null and d.key = ${SpecKeys.DisplacementCc})`;

function filters(q: MotorcycleSearch): SQL[] {
  const where: SQL[] = [visible];

  // Every term must match the model or manufacturer name, so "kestrel strix" finds "Kestrel Moto · Strix 390".
  for (const term of searchTerms(q.q)) {
    const pattern = containsPattern(term);
    where.push(or(ilike(m.name, pattern), ilike(manufacturers.name, pattern))!);
  }
  if (q.manufacturer.length) where.push(inArray(manufacturers.slug, q.manufacturer));
  if (q.category.length) where.push(inArray(m.category, q.category));
  if (q.status.length) where.push(inArray(m.availabilityStatus, q.status));
  if (q.yearFrom !== undefined) where.push(sql`${m.launchYear} >= ${q.yearFrom}`);
  if (q.yearTo !== undefined) where.push(sql`${m.launchYear} <= ${q.yearTo}`);

  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    where.push(sql`exists (
      select 1 from variant_prices p
      join motorcycle_variants v on v.id = p.variant_id
      join markets mk on mk.id = p.market_id
      where v.model_id = "motorcycle_models"."id" and v.deleted_at is null and p.is_current and p.region_code is null and mk.code = ${q.market}
      ${q.minPrice !== undefined ? sql`and p.amount >= ${q.minPrice}` : sql``}
      ${q.maxPrice !== undefined ? sql`and p.amount <= ${q.maxPrice}` : sql``})`);
  }
  if (q.minCc !== undefined || q.maxCc !== undefined) {
    where.push(numericSpecInRange(SpecKeys.DisplacementCc, q.minCc, q.maxCc));
  }
  if (q.maxSeatHeight !== undefined)
    where.push(numericSpecInRange(SpecKeys.SeatHeightMm, undefined, q.maxSeatHeight));
  if (q.maxWeight !== undefined)
    where.push(numericSpecInRange(SpecKeys.KerbWeightKg, undefined, q.maxWeight));
  if (q.fuel.length) where.push(textSpecIn(SpecKeys.FuelType, q.fuel));
  if (q.transmission.length) where.push(textSpecIn(SpecKeys.Transmission, q.transmission));
  if (q.abs.length) where.push(textSpecIn(SpecKeys.Abs, q.abs));
  return where;
}

/** Unknown values sort last in both directions; ties break on name then id for stable paging. */
function ordering(sort: MotorcycleSearch["sort"], market: string): SQL[] {
  const nullsLastBy = (expr: SQL, direction: "asc" | "desc") => [
    sql`${expr} is null`,
    direction === "asc" ? sql`${expr} asc` : sql`${expr} desc`,
  ];
  const primary = (() => {
    switch (sort) {
      case "price-asc":
        return nullsLastBy(startingPriceExpr(market), "asc");
      case "price-desc":
        return nullsLastBy(startingPriceExpr(market), "desc");
      case "engine-asc":
        return nullsLastBy(maxDisplacementExpr, "asc");
      case "engine-desc":
        return nullsLastBy(maxDisplacementExpr, "desc");
      case "newest":
        return [sql`${m.launchYear} is null`, desc(m.launchYear), desc(m.publishedAt)];
      case "updated":
        return [desc(m.updatedAt)];
      default:
        return [asc(manufacturers.name), asc(m.name)];
    }
  })();
  return [...primary, asc(m.name), asc(m.id)];
}

export async function searchMotorcycles(q: MotorcycleSearch): Promise<PagedResult<MotorcycleCard>> {
  const where = and(...filters(q));
  const [{ count }] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(m)
    .innerJoin(manufacturers, eq(manufacturers.id, m.manufacturerId))
    .where(where);

  const ids = await db()
    .select({ id: m.id })
    .from(m)
    .innerJoin(manufacturers, eq(manufacturers.id, m.manufacturerId))
    .where(where)
    .orderBy(...ordering(q.sort, q.market))
    .limit(q.pageSize)
    .offset((q.page - 1) * q.pageSize);

  const cards = await loadCards(
    ids.map((r) => r.id),
    q.market,
  );
  return paged(cards, q.page, q.pageSize, count);
}

// ------------------------------------------------------------------------------------------------- cards

/** Card data for the given models in four queries, returned in input order. */
export async function loadCards(modelIds: string[], market: string): Promise<MotorcycleCard[]> {
  if (modelIds.length === 0) return [];
  market = market.toUpperCase();

  const [basics, images, specs, prices] = await Promise.all([
    db()
      .select({
        id: m.id,
        slug: m.slug,
        name: m.name,
        manufacturerSlug: manufacturers.slug,
        manufacturerName: manufacturers.name,
        category: m.category,
        availabilityStatus: m.availabilityStatus,
        launchYear: m.launchYear,
        summary: m.summary,
        isDemo: m.isDemo,
        updatedAt: m.updatedAt,
      })
      .from(m)
      .innerJoin(manufacturers, eq(manufacturers.id, m.manufacturerId))
      .where(inArray(m.id, modelIds)),
    db()
      .select()
      .from(modelImages)
      .where(and(inArray(modelImages.modelId, modelIds), eq(modelImages.isPrimary, true)))
      .orderBy(asc(modelImages.sortOrder)),
    db()
      .select({
        modelId: motorcycleVariants.modelId,
        isBase: motorcycleVariants.isBase,
        sortOrder: motorcycleVariants.sortOrder,
        key: specificationDefinitions.key,
        numericValue: variantSpecifications.numericValue,
        textValue: variantSpecifications.textValue,
      })
      .from(variantSpecifications)
      .innerJoin(motorcycleVariants, eq(motorcycleVariants.id, variantSpecifications.variantId))
      .innerJoin(
        specificationDefinitions,
        eq(specificationDefinitions.id, variantSpecifications.definitionId),
      )
      .where(
        and(
          inArray(motorcycleVariants.modelId, modelIds),
          isNull(motorcycleVariants.deletedAt),
          inArray(specificationDefinitions.key, CARD_SPEC_KEYS),
        ),
      ),
    db()
      .select({
        modelId: motorcycleVariants.modelId,
        variantName: motorcycleVariants.name,
        amount: variantPrices.amount,
        currencyCode: variantPrices.currencyCode,
        priceType: variantPrices.priceType,
        provenance: variantPrices.provenance,
      })
      .from(variantPrices)
      .innerJoin(motorcycleVariants, eq(motorcycleVariants.id, variantPrices.variantId))
      .innerJoin(markets, eq(markets.id, variantPrices.marketId))
      .where(
        and(
          inArray(motorcycleVariants.modelId, modelIds),
          isNull(motorcycleVariants.deletedAt),
          eq(variantPrices.isCurrent, true),
          isNull(variantPrices.regionCode),
          eq(markets.code, market),
        ),
      ),
  ]);

  const basicsById = new Map(basics.map((b) => [b.id, b]));
  const cards: MotorcycleCard[] = [];
  for (const id of modelIds) {
    const b = basicsById.get(id);
    if (!b) continue;

    // Prefer the base variant's value; otherwise the first variant (by sort order) that has one.
    const modelSpecs = specs
      .filter((s) => s.modelId === id)
      .sort((x, y) => Number(y.isBase) - Number(x.isBase) || x.sortOrder - y.sortOrder);
    const spec = (key: string) => modelSpecs.find((s) => s.key === key);
    const lowest = prices
      .filter((p) => p.modelId === id)
      .reduce<(typeof prices)[number] | null>((min, p) => (!min || p.amount < min.amount ? p : min), null);
    const image = images.find((i) => i.modelId === id);

    cards.push({
      id: b.id,
      slug: b.slug,
      name: b.name,
      manufacturer: { slug: b.manufacturerSlug, name: b.manufacturerName },
      category: b.category,
      availabilityStatus: b.availabilityStatus,
      launchYear: b.launchYear,
      summary: b.summary,
      startingPrice: lowest
        ? {
            amount: lowest.amount,
            currencyCode: lowest.currencyCode,
            priceType: lowest.priceType,
            provenance: lowest.provenance,
            variantName: lowest.variantName,
          }
        : null,
      displacementCc: spec(SpecKeys.DisplacementCc)?.numericValue ?? null,
      maxPowerKw: spec(SpecKeys.MaxPowerKw)?.numericValue ?? null,
      maxTorqueNm: spec(SpecKeys.MaxTorqueNm)?.numericValue ?? null,
      fuelType: spec(SpecKeys.FuelType)?.textValue ?? null,
      image: image
        ? {
            url: image.url,
            altText: image.altText,
            width: image.width,
            height: image.height,
            credit: image.credit,
          }
        : null,
      isDemo: b.isDemo,
      updatedAt: b.updatedAt.toISOString(),
    });
  }
  return cards;
}

// ------------------------------------------------------------------------------------------------ detail

export async function getMotorcycle(slug: string, market: string): Promise<MotorcycleDetail> {
  market = market.toUpperCase();
  const [model] = await db()
    .select({
      id: m.id,
      slug: m.slug,
      name: m.name,
      manufacturerId: m.manufacturerId,
      manufacturerSlug: manufacturers.slug,
      manufacturerName: manufacturers.name,
      category: m.category,
      availabilityStatus: m.availabilityStatus,
      launchYear: m.launchYear,
      summary: m.summary,
      description: m.description,
      isDemo: m.isDemo,
      updatedAt: m.updatedAt,
      publishedAt: m.publishedAt,
    })
    .from(m)
    .innerJoin(manufacturers, eq(manufacturers.id, m.manufacturerId))
    .where(and(visible, eq(m.slug, slug)));
  if (!model) throw new NotFoundError("Motorcycle", slug);

  const [images, variants] = await Promise.all([
    db()
      .select()
      .from(modelImages)
      .where(eq(modelImages.modelId, model.id))
      .orderBy(desc(modelImages.isPrimary), asc(modelImages.sortOrder)),
    db()
      .select({
        id: motorcycleVariants.id,
        slug: motorcycleVariants.slug,
        name: motorcycleVariants.name,
        modelYear: motorcycleVariants.modelYear,
        isBase: motorcycleVariants.isBase,
      })
      .from(motorcycleVariants)
      .where(and(eq(motorcycleVariants.modelId, model.id), isNull(motorcycleVariants.deletedAt)))
      .orderBy(asc(motorcycleVariants.sortOrder), asc(motorcycleVariants.name)),
  ]);
  const variantIds = variants.map((v) => v.id);

  const [prices, specs] =
    variantIds.length === 0
      ? [[], []]
      : await Promise.all([
          db()
            .select({
              variantId: variantPrices.variantId,
              amount: variantPrices.amount,
              currencyCode: variantPrices.currencyCode,
              priceType: variantPrices.priceType,
              regionCode: variantPrices.regionCode,
              effectiveFrom: variantPrices.effectiveFrom,
              provenance: variantPrices.provenance,
              sourceId: variantPrices.sourceCitationId,
            })
            .from(variantPrices)
            .innerJoin(markets, eq(markets.id, variantPrices.marketId))
            .where(
              and(
                inArray(variantPrices.variantId, variantIds),
                eq(variantPrices.isCurrent, true),
                eq(markets.code, market),
              ),
            )
            .orderBy(
              sql`${variantPrices.regionCode} is not null`,
              asc(variantPrices.regionCode),
              asc(variantPrices.priceType),
            ),
          db()
            .select({
              variantId: variantSpecifications.variantId,
              definitionId: variantSpecifications.definitionId,
              key: specificationDefinitions.key,
              label: specificationDefinitions.label,
              unit: specificationDefinitions.unit,
              group: specificationDefinitions.group,
              valueType: specificationDefinitions.valueType,
              sortOrder: specificationDefinitions.sortOrder,
              number: variantSpecifications.numericValue,
              text: variantSpecifications.textValue,
              boolean: variantSpecifications.booleanValue,
              provenance: variantSpecifications.provenance,
              sourceId: variantSpecifications.sourceCitationId,
            })
            .from(variantSpecifications)
            .innerJoin(
              specificationDefinitions,
              eq(specificationDefinitions.id, variantSpecifications.definitionId),
            )
            .where(inArray(variantSpecifications.variantId, variantIds)),
        ]);

  // Group → definition → values index-aligned with variants (null = unknown).
  const variantIndex = new Map(variantIds.map((id, i) => [id, i]));
  const rows = new Map<string, { group: (typeof specs)[number]["group"]; sortOrder: number; row: SpecRow }>();
  for (const s of specs) {
    let entry = rows.get(s.definitionId);
    if (!entry) {
      entry = {
        group: s.group,
        sortOrder: s.sortOrder,
        row: {
          key: s.key,
          label: s.label,
          unit: s.unit,
          valueType: s.valueType,
          values: variantIds.map(() => null),
        },
      };
      rows.set(s.definitionId, entry);
    }
    const value: SpecValue = {
      number: s.number,
      text: s.text,
      boolean: s.boolean,
      provenance: s.provenance,
      sourceId: s.sourceId,
    };
    entry.row.values[variantIndex.get(s.variantId)!] = value;
  }
  const specGroupsData: SpecGroupData[] = specGroups
    .map((group) => ({
      group,
      specs: [...rows.values()]
        .filter((e) => e.group === group)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((e) => e.row),
    }))
    .filter((g) => g.specs.length > 0);

  const citationIds = [
    ...new Set(
      [...specs.map((s) => s.sourceId), ...prices.map((p) => p.sourceId)].filter((id): id is string => !!id),
    ),
  ];
  const sources: Citation[] =
    citationIds.length === 0
      ? []
      : (
          await db()
            .select({
              id: sourceCitations.id,
              sourceName: dataSources.name,
              sourceType: dataSources.sourceType,
              url: sourceCitations.url,
              title: sourceCitations.title,
              retrievedAt: sourceCitations.retrievedAt,
            })
            .from(sourceCitations)
            .innerJoin(dataSources, eq(dataSources.id, sourceCitations.dataSourceId))
            .where(inArray(sourceCitations.id, citationIds))
            .orderBy(asc(dataSources.name))
        ).map((c) => ({ ...c, retrievedAt: c.retrievedAt.toISOString() }));

  // Related: same category first, then same manufacturer, most recently updated.
  const sameCategory = sql`${m.category} = ${model.category}`;
  const related = await db()
    .select({ id: m.id })
    .from(m)
    .innerJoin(manufacturers, eq(manufacturers.id, m.manufacturerId))
    .where(
      and(
        visible,
        sql`${m.id} <> ${model.id}`,
        or(eq(m.category, model.category), eq(m.manufacturerId, model.manufacturerId)),
      ),
    )
    .orderBy(desc(sameCategory), desc(m.updatedAt))
    .limit(RELATED_LIMIT);

  return {
    id: model.id,
    slug: model.slug,
    name: model.name,
    manufacturer: { slug: model.manufacturerSlug, name: model.manufacturerName },
    category: model.category,
    availabilityStatus: model.availabilityStatus,
    launchYear: model.launchYear,
    summary: model.summary,
    description: model.description,
    isDemo: model.isDemo,
    updatedAt: model.updatedAt.toISOString(),
    publishedAt: model.publishedAt?.toISOString() ?? null,
    variants: variants.map((v) => ({
      ...v,
      prices: prices
        .filter((p) => p.variantId === v.id)
        .map((p): Price => ({
          amount: p.amount,
          currencyCode: p.currencyCode,
          priceType: p.priceType,
          regionCode: p.regionCode,
          effectiveFrom: p.effectiveFrom,
          provenance: p.provenance,
          sourceId: p.sourceId,
        })),
    })),
    specGroups: specGroupsData,
    images: images.map((i) => ({
      url: i.url,
      altText: i.altText,
      width: i.width,
      height: i.height,
      credit: i.credit,
    })),
    sources,
    related: await loadCards(
      related.map((r) => r.id),
      market,
    ),
  };
}

// ----------------------------------------------------------------------------------------------- filters

async function range(query: SQL): Promise<{ min: number; max: number } | null> {
  const result = await db().execute<{ min: string | null; max: string | null }>(query);
  const row = result.rows[0];
  return row?.min == null || row.max == null ? null : { min: Number(row.min), max: Number(row.max) };
}

export async function getCatalogueFilters(market: string): Promise<CatalogueFilters> {
  market = market.toUpperCase();
  const [makers, categories, statuses] = await Promise.all([
    db()
      .select({ value: manufacturers.slug, label: manufacturers.name, count: publishedModelCount })
      .from(manufacturers)
      .where(and(isNull(manufacturers.deletedAt), sql`${publishedModelCount} > 0`))
      .orderBy(asc(manufacturers.name)),
    db()
      .select({ key: m.category, count: sql<number>`count(*)::int` })
      .from(m)
      .innerJoin(manufacturers, eq(manufacturers.id, m.manufacturerId))
      .where(visible)
      .groupBy(m.category),
    db()
      .select({ key: m.availabilityStatus, count: sql<number>`count(*)::int` })
      .from(m)
      .innerJoin(manufacturers, eq(manufacturers.id, m.manufacturerId))
      .where(visible)
      .groupBy(m.availabilityStatus),
  ]);

  const [price, displacement, launchYear] = await Promise.all([
    range(sql`select min(p.amount) as min, max(p.amount) as max
      from variant_prices p
      join markets mk on mk.id = p.market_id
      join motorcycle_variants v on v.id = p.variant_id
      join motorcycle_models pm on pm.id = v.model_id
      join manufacturers pmf on pmf.id = pm.manufacturer_id
      where p.is_current and p.region_code is null and mk.code = ${market}
        and v.deleted_at is null and pm.deleted_at is null and pmf.deleted_at is null
        and pm.publication_status = 'Published'`),
    range(sql`select min(s.numeric_value) as min, max(s.numeric_value) as max
      from variant_specifications s
      join specification_definitions d on d.id = s.definition_id and d.key = ${SpecKeys.DisplacementCc}
      join motorcycle_variants v on v.id = s.variant_id
      join motorcycle_models pm on pm.id = v.model_id
      join manufacturers pmf on pmf.id = pm.manufacturer_id
      where v.deleted_at is null and pm.deleted_at is null and pmf.deleted_at is null
        and pm.publication_status = 'Published' and s.numeric_value is not null`),
    range(sql`select min(pm.launch_year) as min, max(pm.launch_year) as max
      from motorcycle_models pm join manufacturers pmf on pmf.id = pm.manufacturer_id
      where pm.deleted_at is null and pmf.deleted_at is null and pm.publication_status = 'Published'`),
  ]);

  const byEnumOrder =
    <T extends string>(order: readonly T[]) =>
    (a: { key: T }, b: { key: T }) =>
      order.indexOf(a.key) - order.indexOf(b.key);

  return {
    manufacturers: makers,
    categories: categories
      .sort(byEnumOrder(vehicleCategories))
      .map((c) => ({ value: c.key, label: c.key, count: c.count })),
    availabilityStatuses: statuses
      .sort(byEnumOrder(availabilityStatuses))
      .map((s) => ({ value: s.key, label: s.key, count: s.count })),
    fuelTypes: [...FuelTypes],
    transmissions: [...Transmissions],
    absOptions: [...AbsOptions],
    price,
    displacementCc: displacement,
    launchYear,
  };
}

// ----------------------------------------------------------------------------------------------- sitemap

export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  const models = await db()
    .select({ slug: m.slug, updatedAt: m.updatedAt })
    .from(m)
    .innerJoin(manufacturers, eq(manufacturers.id, m.manufacturerId))
    .where(visible);
  const makers = await db()
    .select({ slug: manufacturers.slug, updatedAt: manufacturers.updatedAt })
    .from(manufacturers)
    .where(and(isNull(manufacturers.deletedAt), sql`${publishedModelCount} > 0`));
  return [
    ...models.map((r) => ({
      type: "motorcycle" as const,
      slug: r.slug,
      updatedAt: r.updatedAt.toISOString(),
    })),
    ...makers.map((r) => ({
      type: "manufacturer" as const,
      slug: r.slug,
      updatedAt: r.updatedAt.toISOString(),
    })),
  ];
}
