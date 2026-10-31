/**
 * Drizzle schema for MotoScope. It mirrors the PostgreSQL schema originally created by EF Core
 * (migration 20261031082752_InitialCatalogue), which is the Drizzle baseline (migrations/0000).
 * Table, column, index and constraint names are kept identical so existing databases are adopted unchanged.
 * See docs/DATABASE_MIGRATION.md.
 */
import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type {
  AvailabilityStatus,
  DataProvenance,
  DataSourceType,
  PriceType,
  PublicationStatus,
  SpecGroup,
  SpecValueType,
  VehicleCategory,
} from "@/lib/domain/catalogue/enums";

const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const enumColumn = <T extends string>(name: string) => varchar(name, { length: 32 }).$type<T>();
const audit = {
  createdAt: tstz("created_at").notNull(),
  updatedAt: tstz("updated_at").notNull(),
};

// ---------------------------------------------------------------------------------------------- catalogue

export const markets = pgTable(
  "markets",
  {
    id: uuid("id").notNull(),
    code: char("code", { length: 2 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull(),
    isActive: boolean("is_active").notNull(),
    ...audit,
  },
  (t) => [primaryKey({ name: "pk_markets", columns: [t.id] }), uniqueIndex("ix_markets_code").on(t.code)],
);

export const manufacturers = pgTable(
  "manufacturers",
  {
    id: uuid("id").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    countryOfOrigin: varchar("country_of_origin", { length: 100 }),
    websiteUrl: varchar("website_url", { length: 500 }),
    description: varchar("description", { length: 4000 }),
    isDemo: boolean("is_demo").notNull(),
    deletedAt: tstz("deleted_at"),
    ...audit,
  },
  (t) => [
    primaryKey({ name: "pk_manufacturers", columns: [t.id] }),
    uniqueIndex("ix_manufacturers_name")
      .on(t.name)
      .where(sql`(deleted_at IS NULL)`),
    uniqueIndex("ix_manufacturers_slug").on(t.slug),
  ],
);

export const motorcycleModels = pgTable(
  "motorcycle_models",
  {
    id: uuid("id").notNull(),
    manufacturerId: uuid("manufacturer_id").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 160 }).notNull(),
    category: enumColumn<VehicleCategory>("category").notNull(),
    availabilityStatus: enumColumn<AvailabilityStatus>("availability_status").notNull(),
    launchYear: integer("launch_year"),
    summary: varchar("summary", { length: 500 }),
    description: varchar("description", { length: 8000 }),
    publicationStatus: enumColumn<PublicationStatus>("publication_status").notNull(),
    publishedAt: tstz("published_at"),
    isDemo: boolean("is_demo").notNull(),
    deletedAt: tstz("deleted_at"),
    ...audit,
  },
  (t) => [
    primaryKey({ name: "pk_motorcycle_models", columns: [t.id] }),
    uniqueIndex("ix_motorcycle_models_manufacturer_id_name")
      .on(t.manufacturerId, t.name)
      .where(sql`(deleted_at IS NULL)`),
    index("ix_motorcycle_models_name").using("gin", t.name.op("gin_trgm_ops")),
    index("ix_motorcycle_models_publication_status_category").on(t.publicationStatus, t.category),
    uniqueIndex("ix_motorcycle_models_slug").on(t.slug),
    index("ix_motorcycle_models_updated_at").on(t.updatedAt),
    foreignKey({
      name: "fk_motorcycle_models_manufacturers_manufacturer_id",
      columns: [t.manufacturerId],
      foreignColumns: [manufacturers.id],
    }).onDelete("restrict"),
  ],
);

export const motorcycleVariants = pgTable(
  "motorcycle_variants",
  {
    id: uuid("id").notNull(),
    modelId: uuid("model_id").notNull(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 120 }).notNull(),
    modelYear: integer("model_year"),
    isBase: boolean("is_base").notNull(),
    sortOrder: integer("sort_order").notNull(),
    deletedAt: tstz("deleted_at"),
    ...audit,
  },
  (t) => [
    primaryKey({ name: "pk_motorcycle_variants", columns: [t.id] }),
    uniqueIndex("ix_motorcycle_variants_model_id_slug").on(t.modelId, t.slug),
    foreignKey({
      name: "fk_motorcycle_variants_motorcycle_models_model_id",
      columns: [t.modelId],
      foreignColumns: [motorcycleModels.id],
    }).onDelete("restrict"),
  ],
);

export const dataSources = pgTable(
  "data_sources",
  {
    id: uuid("id").notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    homepageUrl: varchar("homepage_url", { length: 500 }),
    sourceType: enumColumn<DataSourceType>("source_type").notNull(),
    notes: varchar("notes", { length: 2000 }),
    ...audit,
  },
  (t) => [
    primaryKey({ name: "pk_data_sources", columns: [t.id] }),
    uniqueIndex("ix_data_sources_name").on(t.name),
  ],
);

export const sourceCitations = pgTable(
  "source_citations",
  {
    id: uuid("id").notNull(),
    dataSourceId: uuid("data_source_id").notNull(),
    url: varchar("url", { length: 1000 }),
    title: varchar("title", { length: 300 }),
    retrievedAt: tstz("retrieved_at").notNull(),
    notes: varchar("notes", { length: 1000 }),
    ...audit,
  },
  (t) => [
    primaryKey({ name: "pk_source_citations", columns: [t.id] }),
    index("ix_source_citations_data_source_id").on(t.dataSourceId),
    foreignKey({
      name: "fk_source_citations_data_sources_data_source_id",
      columns: [t.dataSourceId],
      foreignColumns: [dataSources.id],
    }).onDelete("restrict"),
  ],
);

export const specificationDefinitions = pgTable(
  "specification_definitions",
  {
    id: uuid("id").notNull(),
    key: varchar("key", { length: 64 }).notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    group: enumColumn<SpecGroup>("group").notNull(),
    valueType: enumColumn<SpecValueType>("value_type").notNull(),
    unit: varchar("unit", { length: 16 }),
    allowedValues: text("allowed_values").array().notNull(),
    isFilterable: boolean("is_filterable").notNull(),
    sortOrder: integer("sort_order").notNull(),
    description: varchar("description", { length: 500 }),
    ...audit,
  },
  (t) => [
    primaryKey({ name: "pk_specification_definitions", columns: [t.id] }),
    uniqueIndex("ix_specification_definitions_key").on(t.key),
  ],
);

export const variantSpecifications = pgTable(
  "variant_specifications",
  {
    id: uuid("id").notNull(),
    variantId: uuid("variant_id").notNull(),
    definitionId: uuid("definition_id").notNull(),
    numericValue: numeric("numeric_value", { precision: 12, scale: 3, mode: "number" }),
    textValue: varchar("text_value", { length: 500 }),
    booleanValue: boolean("boolean_value"),
    provenance: enumColumn<DataProvenance>("provenance").notNull(),
    sourceCitationId: uuid("source_citation_id"),
    verifiedAt: tstz("verified_at"),
    notes: varchar("notes", { length: 1000 }),
    ...audit,
  },
  (t) => [
    primaryKey({ name: "pk_variant_specifications", columns: [t.id] }),
    index("ix_variant_specifications_definition_id_numeric_value").on(t.definitionId, t.numericValue),
    index("ix_variant_specifications_definition_id_text_value").on(t.definitionId, t.textValue),
    index("ix_variant_specifications_source_citation_id").on(t.sourceCitationId),
    uniqueIndex("ix_variant_specifications_variant_id_definition_id").on(t.variantId, t.definitionId),
    foreignKey({
      name: "fk_variant_specifications_motorcycle_variants_variant_id",
      columns: [t.variantId],
      foreignColumns: [motorcycleVariants.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_variant_specifications_source_citations_source_citation_id",
      columns: [t.sourceCitationId],
      foreignColumns: [sourceCitations.id],
    }).onDelete("set null"),
    foreignKey({
      name: "fk_variant_specifications_specification_definitions_definition",
      columns: [t.definitionId],
      foreignColumns: [specificationDefinitions.id],
    }).onDelete("restrict"),
    check(
      "ck_variant_specifications_single_value",
      sql`num_nonnulls(numeric_value, text_value, boolean_value) = 1`,
    ),
  ],
);

export const variantPrices = pgTable(
  "variant_prices",
  {
    id: uuid("id").notNull(),
    variantId: uuid("variant_id").notNull(),
    marketId: uuid("market_id").notNull(),
    regionCode: varchar("region_code", { length: 16 }),
    priceType: enumColumn<PriceType>("price_type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2, mode: "number" }).notNull(),
    currencyCode: char("currency_code", { length: 3 }).notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    isCurrent: boolean("is_current").notNull(),
    provenance: enumColumn<DataProvenance>("provenance").notNull(),
    sourceCitationId: uuid("source_citation_id"),
    ...audit,
  },
  (t) => [
    primaryKey({ name: "pk_variant_prices", columns: [t.id] }),
    index("ix_variant_prices_market_id_is_current_amount").on(t.marketId, t.isCurrent, t.amount),
    index("ix_variant_prices_source_citation_id").on(t.sourceCitationId),
    index("ix_variant_prices_variant_id_market_id_is_current").on(t.variantId, t.marketId, t.isCurrent),
    // The real index is also NULLS NOT DISTINCT (created by the baseline SQL); Drizzle's index builder cannot express it.
    uniqueIndex("ix_variant_prices_variant_id_market_id_region_code_price_type")
      .on(t.variantId, t.marketId, t.regionCode, t.priceType)
      .where(sql`is_current`),
    foreignKey({
      name: "fk_variant_prices_markets_market_id",
      columns: [t.marketId],
      foreignColumns: [markets.id],
    }).onDelete("restrict"),
    foreignKey({
      name: "fk_variant_prices_motorcycle_variants_variant_id",
      columns: [t.variantId],
      foreignColumns: [motorcycleVariants.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_variant_prices_source_citations_source_citation_id",
      columns: [t.sourceCitationId],
      foreignColumns: [sourceCitations.id],
    }).onDelete("set null"),
    check("ck_variant_prices_amount_positive", sql`amount > (0)::numeric`),
  ],
);

export const modelImages = pgTable(
  "model_images",
  {
    id: uuid("id").notNull(),
    modelId: uuid("model_id").notNull(),
    variantId: uuid("variant_id"),
    storageProvider: varchar("storage_provider", { length: 32 }).notNull(),
    storageKey: varchar("storage_key", { length: 500 }).notNull(),
    url: varchar("url", { length: 1000 }).notNull(),
    altText: varchar("alt_text", { length: 300 }).notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    credit: varchar("credit", { length: 300 }),
    licenseNote: varchar("license_note", { length: 500 }),
    isPrimary: boolean("is_primary").notNull(),
    sortOrder: integer("sort_order").notNull(),
    ...audit,
  },
  (t) => [
    primaryKey({ name: "pk_model_images", columns: [t.id] }),
    index("ix_model_images_model_id_sort_order").on(t.modelId, t.sortOrder),
    index("ix_model_images_variant_id").on(t.variantId),
    foreignKey({
      name: "fk_model_images_motorcycle_models_model_id",
      columns: [t.modelId],
      foreignColumns: [motorcycleModels.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_model_images_motorcycle_variants_variant_id",
      columns: [t.variantId],
      foreignColumns: [motorcycleVariants.id],
    }).onDelete("set null"),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").notNull(),
    occurredAt: tstz("occurred_at").notNull(),
    userId: uuid("user_id"),
    userName: varchar("user_name", { length: 256 }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: uuid("entity_id"),
    summary: varchar("summary", { length: 1000 }),
    /** Field diff `{ field: { from, to } }`; JSONB because the shape varies by entity type. */
    changes: jsonb("changes"),
    correlationId: varchar("correlation_id", { length: 100 }),
  },
  (t) => [
    primaryKey({ name: "pk_audit_logs", columns: [t.id] }),
    index("ix_audit_logs_entity_type_entity_id").on(t.entityType, t.entityId),
    index("ix_audit_logs_occurred_at").on(t.occurredAt),
  ],
);

// ---------------------------------------------------------------------------------------------- identity
// Column layout inherited from ASP.NET Core Identity (kept so existing staff accounts keep working).

export const users = pgTable(
  "users",
  {
    id: uuid("id").notNull(),
    displayName: varchar("display_name", { length: 100 }),
    createdAt: tstz("created_at").notNull(),
    isActive: boolean("is_active").notNull(),
    userName: varchar("user_name", { length: 256 }),
    normalizedUserName: varchar("normalized_user_name", { length: 256 }),
    email: varchar("email", { length: 256 }),
    normalizedEmail: varchar("normalized_email", { length: 256 }),
    emailConfirmed: boolean("email_confirmed").notNull(),
    passwordHash: text("password_hash"),
    securityStamp: text("security_stamp"),
    concurrencyStamp: text("concurrency_stamp"),
    phoneNumber: text("phone_number"),
    phoneNumberConfirmed: boolean("phone_number_confirmed").notNull(),
    twoFactorEnabled: boolean("two_factor_enabled").notNull(),
    lockoutEnd: tstz("lockout_end"),
    lockoutEnabled: boolean("lockout_enabled").notNull(),
    accessFailedCount: integer("access_failed_count").notNull(),
  },
  (t) => [
    primaryKey({ name: "pk_users", columns: [t.id] }),
    index("EmailIndex").on(t.normalizedEmail),
    uniqueIndex("UserNameIndex").on(t.normalizedUserName),
  ],
);

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").notNull(),
    name: varchar("name", { length: 256 }),
    normalizedName: varchar("normalized_name", { length: 256 }),
    concurrencyStamp: text("concurrency_stamp"),
  },
  (t) => [
    primaryKey({ name: "pk_roles", columns: [t.id] }),
    uniqueIndex("RoleNameIndex").on(t.normalizedName),
  ],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id").notNull(),
    roleId: uuid("role_id").notNull(),
  },
  (t) => [
    primaryKey({ name: "pk_user_roles", columns: [t.userId, t.roleId] }),
    index("ix_user_roles_role_id").on(t.roleId),
    foreignKey({
      name: "fk_user_roles_roles_role_id",
      columns: [t.roleId],
      foreignColumns: [roles.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "fk_user_roles_users_user_id",
      columns: [t.userId],
      foreignColumns: [users.id],
    }).onDelete("cascade"),
  ],
);

// Unused Identity tables (claims, external logins, tokens) remain in the baseline SQL for compatibility but are not
// declared here: no code reads them. They can be dropped by a future, explicitly reviewed migration.

/** Server-side sessions (added by the Next.js backend). Only the SHA-256 of the cookie token is stored. */
export const sessions = pgTable(
  "sessions",
  {
    id: varchar("id", { length: 64 }).notNull(),
    userId: uuid("user_id").notNull(),
    createdAt: tstz("created_at").notNull(),
    expiresAt: tstz("expires_at").notNull(),
  },
  (t) => [
    primaryKey({ name: "pk_sessions", columns: [t.id] }),
    index("ix_sessions_user_id").on(t.userId),
    index("ix_sessions_expires_at").on(t.expiresAt),
    foreignKey({
      name: "fk_sessions_users_user_id",
      columns: [t.userId],
      foreignColumns: [users.id],
    }).onDelete("cascade"),
  ],
);
