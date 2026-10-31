import "server-only";
import { and, asc, desc, eq, ilike, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import type { PagedResult } from "@/lib/api/types";
import { db, type Executor } from "@/lib/db";
import { manufacturers, motorcycleModels } from "@/lib/db/schema";
import { CONCURRENCY_CONFLICT, ConflictError, NotFoundError, ValidationError } from "@/lib/http/errors";
import { containsPattern, newId, slugify } from "@/lib/utils/text";
import type { AdminListQuery, ManufacturerUpsert } from "@/lib/validation/admin";
import { recordAudit, ChangeSet, type Actor } from "../audit";
import { paged } from "../catalogue";

const ENTITY = "Manufacturer";

export interface AdminManufacturer {
  id: string;
  name: string;
  slug: string;
  countryOfOrigin: string | null;
  websiteUrl: string | null;
  description: string | null;
  isDemo: boolean;
  modelCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  /** Optimistic concurrency token (PostgreSQL xmin). Send it back on update. */
  version: number;
}

const columns = {
  id: manufacturers.id,
  name: manufacturers.name,
  slug: manufacturers.slug,
  countryOfOrigin: manufacturers.countryOfOrigin,
  websiteUrl: manufacturers.websiteUrl,
  description: manufacturers.description,
  isDemo: manufacturers.isDemo,
  modelCount: sql<number>`(select count(*)::int from motorcycle_models mm
    where mm.manufacturer_id = "manufacturers"."id" and mm.deleted_at is null)`,
  createdAt: manufacturers.createdAt,
  updatedAt: manufacturers.updatedAt,
  deletedAt: manufacturers.deletedAt,
  version: sql<string>`${manufacturers}.xmin::text`,
};

type Row = { createdAt: Date; updatedAt: Date; deletedAt: Date | null; version: string } & Omit<
  AdminManufacturer,
  "createdAt" | "updatedAt" | "deletedAt" | "version"
>;

const toDto = (r: Row): AdminManufacturer => ({
  ...r,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
  deletedAt: r.deletedAt?.toISOString() ?? null,
  version: Number(r.version),
});

const trimOrNull = (v: string | null | undefined) => (v == null ? null : v.trim());

export async function listManufacturers(q: AdminListQuery): Promise<PagedResult<AdminManufacturer>> {
  const where: SQL[] = [];
  if (!q.includeArchived) where.push(isNull(manufacturers.deletedAt));
  if (q.q?.trim()) {
    const pattern = containsPattern(q.q);
    where.push(or(ilike(manufacturers.name, pattern), ilike(manufacturers.slug, pattern))!);
  }
  const condition = where.length ? and(...where) : undefined;
  const [{ count }] = await db()
    .select({ count: sql<number>`count(*)::int` })
    .from(manufacturers)
    .where(condition);
  const rows = await db()
    .select(columns)
    .from(manufacturers)
    .where(condition)
    .orderBy(
      q.sort === "updated" ? desc(manufacturers.updatedAt) : asc(manufacturers.name),
      asc(manufacturers.id),
    )
    .limit(q.pageSize)
    .offset((q.page - 1) * q.pageSize);
  return paged(rows.map(toDto), q.page, q.pageSize, count);
}

/** Includes archived records (admin view). */
export async function getManufacturer(id: string, executor: Executor = db()): Promise<AdminManufacturer> {
  const [row] = await executor.select(columns).from(manufacturers).where(eq(manufacturers.id, id));
  if (!row) throw new NotFoundError(ENTITY, id);
  return toDto(row);
}

async function ensureUnique(tx: Executor, id: string | null, name: string, slug: string) {
  // Slugs stay reserved after archival so published URLs are never reused.
  const slugTaken = await tx
    .select({ id: manufacturers.id })
    .from(manufacturers)
    .where(and(eq(manufacturers.slug, slug), id ? ne(manufacturers.id, id) : undefined))
    .limit(1);
  if (slugTaken.length)
    throw new ConflictError(`The slug '${slug}' is already used by another manufacturer.`);

  const nameTaken = await tx
    .select({ id: manufacturers.id })
    .from(manufacturers)
    .where(
      and(
        eq(manufacturers.name, name),
        isNull(manufacturers.deletedAt),
        id ? ne(manufacturers.id, id) : undefined,
      ),
    )
    .limit(1);
  if (nameTaken.length) throw new ConflictError(`A manufacturer named '${name}' already exists.`);
}

export async function createManufacturer(
  input: ManufacturerUpsert,
  actor: Actor,
): Promise<AdminManufacturer> {
  const now = new Date();
  const name = input.name.trim();
  const slug = input.slug ?? slugify(name);
  const id = newId();

  return db().transaction(async (tx) => {
    await ensureUnique(tx, null, name, slug);
    await tx.insert(manufacturers).values({
      id,
      name,
      slug,
      countryOfOrigin: trimOrNull(input.countryOfOrigin),
      websiteUrl: trimOrNull(input.websiteUrl),
      description: trimOrNull(input.description),
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    });
    await recordAudit(
      tx,
      actor,
      {
        action: "manufacturer.created",
        entityType: ENTITY,
        entityId: id,
        summary: `Created manufacturer '${name}'`,
      },
      now,
    );
    return getManufacturer(id, tx);
  });
}

export async function updateManufacturer(
  id: string,
  input: ManufacturerUpsert,
  actor: Actor,
): Promise<AdminManufacturer> {
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
      .from(manufacturers)
      .where(and(eq(manufacturers.id, id), isNull(manufacturers.deletedAt)));
    if (!current) throw new NotFoundError(ENTITY, id);

    const name = input.name.trim();
    const slug = input.slug ?? current.slug;
    await ensureUnique(tx, id, name, slug);

    const c = new ChangeSet();
    const values = {
      name: c.set("name", current.name, name),
      slug: c.set("slug", current.slug, slug),
      countryOfOrigin: c.set("countryOfOrigin", current.countryOfOrigin, trimOrNull(input.countryOfOrigin)),
      websiteUrl: c.set("websiteUrl", current.websiteUrl, trimOrNull(input.websiteUrl)),
      description: c.set("description", current.description, trimOrNull(input.description)),
    };

    if (c.hasChanges) {
      const updated = await tx
        .update(manufacturers)
        .set({ ...values, updatedAt: now })
        .where(and(eq(manufacturers.id, id), sql`${manufacturers}.xmin = ${String(version)}::xid`))
        .returning({ id: manufacturers.id });
      if (updated.length === 0) throw CONCURRENCY_CONFLICT;
      await recordAudit(
        tx,
        actor,
        {
          action: "manufacturer.updated",
          entityType: ENTITY,
          entityId: id,
          summary: `Updated manufacturer '${values.name}'`,
          changes: c.changes,
        },
        now,
      );
    }
    return getManufacturer(id, tx);
  });
}

/** Archives (soft-deletes) a manufacturer. Refused while it still has active models. */
export async function archiveManufacturer(id: string, actor: Actor): Promise<void> {
  const now = new Date();
  await db().transaction(async (tx) => {
    const [current] = await tx
      .select({ name: manufacturers.name })
      .from(manufacturers)
      .where(and(eq(manufacturers.id, id), isNull(manufacturers.deletedAt)));
    if (!current) throw new NotFoundError(ENTITY, id);

    const active = await tx
      .select({ id: motorcycleModels.id })
      .from(motorcycleModels)
      .where(and(eq(motorcycleModels.manufacturerId, id), isNull(motorcycleModels.deletedAt)))
      .limit(1);
    if (active.length) throw new ConflictError("Archive or move this manufacturer's models first.");

    await tx.update(manufacturers).set({ deletedAt: now, updatedAt: now }).where(eq(manufacturers.id, id));
    await recordAudit(
      tx,
      actor,
      {
        action: "manufacturer.archived",
        entityType: ENTITY,
        entityId: id,
        summary: `Archived manufacturer '${current.name}'`,
      },
      now,
    );
  });
}
