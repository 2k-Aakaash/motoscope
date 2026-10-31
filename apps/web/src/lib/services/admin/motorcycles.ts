import "server-only";
import { and, asc, desc, eq, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import type { PagedResult } from "@/lib/api/types";
import { db, type Executor } from "@/lib/db";
import { manufacturers, motorcycleModels as m } from "@/lib/db/schema";
import type { AvailabilityStatus, PublicationStatus, VehicleCategory } from "@/lib/domain/catalogue/enums";
import { CONCURRENCY_CONFLICT, ConflictError, NotFoundError, ValidationError } from "@/lib/http/errors";
import { containsPattern, newId, slugify } from "@/lib/utils/text";
import type { AdminListQuery, MotorcycleUpsert } from "@/lib/validation/admin";
import { recordAudit, ChangeSet, type Actor } from "../audit";
import { paged } from "../catalogue";

const ENTITY = "MotorcycleModel";

export interface AdminMotorcycleListItem {
  id: string;
  name: string;
  slug: string;
  manufacturerId: string;
  manufacturerName: string;
  category: VehicleCategory;
  availabilityStatus: AvailabilityStatus;
  publicationStatus: PublicationStatus;
  launchYear: number | null;
  variantCount: number;
  isDemo: boolean;
  updatedAt: string;
}

export interface AdminMotorcycle {
  id: string;
  manufacturerId: string;
  name: string;
  slug: string;
  category: VehicleCategory;
  availabilityStatus: AvailabilityStatus;
  launchYear: number | null;
  summary: string | null;
  description: string | null;
  publicationStatus: PublicationStatus;
  publishedAt: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

const trimOrNull = (v: string | null | undefined) => (v == null ? null : v.trim());

export async function listMotorcycles(q: AdminListQuery): Promise<PagedResult<AdminMotorcycleListItem>> {
  const where: SQL[] = [];
  if (!q.includeArchived) where.push(isNull(m.deletedAt));
  if (q.q?.trim()) {
    const pattern = containsPattern(q.q);
    where.push(or(ilike(sql`${manufacturers.name} || ' ' || ${m.name}`, pattern), ilike(m.slug, pattern))!);
  }
  const condition = where.length ? and(...where) : undefined;
  const [{ count }] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(m)
    .innerJoin(manufacturers, eq(manufacturers.id, m.manufacturerId))
    .where(condition);
  const rows = await db()
    .select({
      id: m.id,
      name: m.name,
      slug: m.slug,
      manufacturerId: m.manufacturerId,
      manufacturerName: manufacturers.name,
      category: m.category,
      availabilityStatus: m.availabilityStatus,
      publicationStatus: m.publicationStatus,
      launchYear: m.launchYear,
      variantCount: sql<number>`(select count(*)::int from motorcycle_variants v where v.model_id = "motorcycle_models"."id" and v.deleted_at is null)`,
      isDemo: m.isDemo,
      updatedAt: m.updatedAt,
    })
    .from(m)
    .innerJoin(manufacturers, eq(manufacturers.id, m.manufacturerId))
    .where(condition)
    .orderBy(q.sort === "updated" ? desc(m.updatedAt) : asc(m.name), asc(m.id))
    .limit(q.pageSize)
    .offset((q.page - 1) * q.pageSize);
  return paged(
    rows.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() })),
    q.page,
    q.pageSize,
    count,
  );
}

/** Includes archived records (admin view). */
export async function getMotorcycle(id: string, executor: Executor = db()): Promise<AdminMotorcycle> {
  const [r] = await executor
    .select({
      id: m.id,
      manufacturerId: m.manufacturerId,
      name: m.name,
      slug: m.slug,
      category: m.category,
      availabilityStatus: m.availabilityStatus,
      launchYear: m.launchYear,
      summary: m.summary,
      description: m.description,
      publicationStatus: m.publicationStatus,
      publishedAt: m.publishedAt,
      isDemo: m.isDemo,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
      version: sql<string>`${m}.xmin::text`,
    })
    .from(m)
    .where(eq(m.id, id));
  if (!r) throw new NotFoundError(ENTITY, id);
  return {
    ...r,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    version: Number(r.version),
  };
}

async function activeManufacturer(tx: Executor, id: string) {
  const [row] = await tx
    .select({ id: manufacturers.id, name: manufacturers.name })
    .from(manufacturers)
    .where(and(eq(manufacturers.id, id), isNull(manufacturers.deletedAt)));
  if (!row) throw new NotFoundError("Manufacturer", id);
  return row;
}

async function ensureUnique(
  tx: Executor,
  id: string | null,
  manufacturerId: string,
  name: string,
  slug: string,
) {
  const slugTaken = await tx
    .select({ id: m.id })
    .from(m)
    .where(and(eq(m.slug, slug), id ? ne(m.id, id) : undefined))
    .limit(1);
  if (slugTaken.length) throw new ConflictError(`The slug '${slug}' is already used by another model.`);

  const nameTaken = await tx
    .select({ id: m.id })
    .from(m)
    .where(
      and(
        eq(m.manufacturerId, manufacturerId),
        eq(m.name, name),
        isNull(m.deletedAt),
        id ? ne(m.id, id) : undefined,
      ),
    )
    .limit(1);
  if (nameTaken.length) throw new ConflictError(`This manufacturer already has a model named '${name}'.`);
}

export async function createMotorcycle(input: MotorcycleUpsert, actor: Actor): Promise<AdminMotorcycle> {
  const now = new Date();
  const id = newId();
  return db().transaction(async (tx) => {
    const manufacturer = await activeManufacturer(tx, input.manufacturerId);
    const name = input.name.trim();
    const slug = input.slug ?? slugify(`${manufacturer.name} ${name}`);
    await ensureUnique(tx, null, input.manufacturerId, name, slug);

    await tx.insert(m).values({
      id,
      manufacturerId: input.manufacturerId,
      name,
      slug,
      category: input.category,
      availabilityStatus: input.availabilityStatus,
      launchYear: input.launchYear ?? null,
      summary: trimOrNull(input.summary),
      description: trimOrNull(input.description),
      publicationStatus: input.publicationStatus,
      publishedAt: input.publicationStatus === "Published" ? now : null,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    });
    await recordAudit(
      tx,
      actor,
      {
        action: "motorcycle.created",
        entityType: ENTITY,
        entityId: id,
        summary: `Created model '${manufacturer.name} ${name}' (${input.publicationStatus})`,
      },
      now,
    );
    return getMotorcycle(id, tx);
  });
}

export async function updateMotorcycle(
  id: string,
  input: MotorcycleUpsert,
  actor: Actor,
): Promise<AdminMotorcycle> {
  if (input.version == null) {
    throw new ValidationError({
      version: ["'Version' is required when updating. Reload the record and try again."],
    });
  }
  const version = input.version;
  const now = new Date();

  return db().transaction(async (tx) => {
    const [current] = await tx
      .select()
      .from(m)
      .where(and(eq(m.id, id), isNull(m.deletedAt)));
    if (!current) throw new NotFoundError(ENTITY, id);
    await activeManufacturer(tx, input.manufacturerId);

    const name = input.name.trim();
    const slug = input.slug ?? current.slug;
    await ensureUnique(tx, id, input.manufacturerId, name, slug);

    const c = new ChangeSet();
    const values = {
      manufacturerId: c.set("manufacturerId", current.manufacturerId, input.manufacturerId),
      name: c.set("name", current.name, name),
      slug: c.set("slug", current.slug, slug),
      category: c.set("category", current.category, input.category),
      availabilityStatus: c.set("availabilityStatus", current.availabilityStatus, input.availabilityStatus),
      launchYear: c.set("launchYear", current.launchYear, input.launchYear ?? null),
      summary: c.set("summary", current.summary, trimOrNull(input.summary)),
      description: c.set("description", current.description, trimOrNull(input.description)),
      publicationStatus: c.set("publicationStatus", current.publicationStatus, input.publicationStatus),
      // Publishing sets the first-publication date once; later re-publishing keeps it.
      publishedAt:
        input.publicationStatus === "Published" && current.publicationStatus !== "Published"
          ? (current.publishedAt ?? now)
          : current.publishedAt,
    };

    if (c.hasChanges) {
      const updated = await tx
        .update(m)
        .set({ ...values, updatedAt: now })
        .where(and(eq(m.id, id), sql`${m}.xmin = ${String(version)}::xid`))
        .returning({ id: m.id });
      if (updated.length === 0) throw CONCURRENCY_CONFLICT;
      await recordAudit(
        tx,
        actor,
        {
          action: "motorcycle.updated",
          entityType: ENTITY,
          entityId: id,
          summary: `Updated model '${values.name}'`,
          changes: c.changes,
        },
        now,
      );
    }
    return getMotorcycle(id, tx);
  });
}

/** Archives a model: hidden from the public site, slug stays reserved, history retained. */
export async function archiveMotorcycle(id: string, actor: Actor): Promise<void> {
  const now = new Date();
  await db().transaction(async (tx) => {
    const [current] = await tx
      .select({ name: m.name })
      .from(m)
      .where(and(eq(m.id, id), isNull(m.deletedAt)));
    if (!current) throw new NotFoundError(ENTITY, id);
    await tx
      .update(m)
      .set({ publicationStatus: "Archived", deletedAt: now, updatedAt: now })
      .where(eq(m.id, id));
    await recordAudit(
      tx,
      actor,
      {
        action: "motorcycle.archived",
        entityType: ENTITY,
        entityId: id,
        summary: `Archived model '${current.name}'`,
      },
      now,
    );
  });
}
