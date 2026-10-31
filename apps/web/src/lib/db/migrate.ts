import path from "node:path";
import { sql } from "drizzle-orm";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { logger } from "@/lib/logging/logger";
import type { Database } from "./index";
import { seedReferenceData } from "./seed/reference";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "src", "lib", "db", "migrations");
const EF_BASELINE_MIGRATION = "20261031082752_InitialCatalogue";

/**
 * Applies pending Drizzle migrations, then idempotent reference data. Non-destructive by design.
 *
 * Adoption of databases created by the former EF Core backend: when Drizzle has never run on the database and
 * `__ef_migrations_history` contains the EF baseline, the Drizzle baseline (0000, identical SQL) is recorded as
 * applied instead of executed. Only later migrations (e.g. 0001_sessions) run. The EF history table is kept.
 */
export async function migrateDatabase(
  database: Database,
  migrationsFolder = MIGRATIONS_FOLDER,
): Promise<void> {
  await database.execute(sql`create schema if not exists drizzle`);
  await database.execute(
    sql`create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`,
  );

  const { rows: applied } = await database.execute<{ n: number }>(
    sql`select count(*)::int as n from drizzle.__drizzle_migrations`,
  );
  if (applied[0].n === 0) {
    const { rows: efTable } = await database.execute<{ t: string | null }>(
      sql`select to_regclass('public.__ef_migrations_history')::text as t`,
    );
    if (efTable[0].t) {
      const { rows: efRows } = await database.execute<{ migration_id: string }>(
        sql`select migration_id from public.__ef_migrations_history order by migration_id`,
      );
      const efIds = efRows.map((r) => r.migration_id);
      if (efIds.length !== 1 || efIds[0] !== EF_BASELINE_MIGRATION) {
        throw new Error(
          `Unexpected EF Core migration history (${efIds.join(", ") || "empty"}). Adoption supports only ${EF_BASELINE_MIGRATION}; review manually.`,
        );
      }
      const [baseline] = readMigrationFiles({ migrationsFolder });
      await database.execute(
        sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${baseline.hash}, ${baseline.folderMillis})`,
      );
      logger.info("Adopted EF Core database: Drizzle baseline recorded as applied", {
        efMigration: EF_BASELINE_MIGRATION,
      });
    }
  }

  await migrate(database, { migrationsFolder });
  await seedReferenceData(database);
}
