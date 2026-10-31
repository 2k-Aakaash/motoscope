import { readFileSync } from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MIGRATIONS_FOLDER, migrateDatabase } from "@/lib/db/migrate";
import * as schema from "@/lib/db/schema";
import { hasDb } from "./http";

/**
 * Simulates a database created by the former EF Core backend (baseline SQL + EF history + existing data) and checks
 * that `migrateDatabase` adopts it without re-running the baseline or touching data.
 */
describe.skipIf(!hasDb)("adopting an EF Core-created database", () => {
  const base = new URL(process.env.MOTOSCOPE_TEST_DB ?? "postgres://localhost/x");
  const dbName = `${base.pathname.slice(1)}_adopt`;
  const adoptUrl = new URL(base);
  adoptUrl.pathname = `/${dbName}`;
  let pool: Pool;

  async function admin(statement: string) {
    const client = new Client({ connectionString: base.toString() });
    await client.connect();
    try {
      await client.query(statement);
    } finally {
      await client.end();
    }
  }

  beforeAll(async () => {
    await admin(`drop database if exists "${dbName}" with (force)`);
    await admin(`create database "${dbName}"`);
    pool = new Pool({ connectionString: adoptUrl.toString(), max: 2 });

    // What `dotnet run -- migrate` produced: the baseline schema, EF's history row, and some data.
    const baselineSql = readFileSync(path.join(MIGRATIONS_FOLDER, "0000_baseline.sql"), "utf8").split(
      "--> statement-breakpoint",
    );
    for (const statement of baselineSql) await pool.query(statement);
    await pool.query(
      `create table __ef_migrations_history (migration_id varchar(150) primary key, product_version varchar(32) not null)`,
    );
    await pool.query(
      `insert into __ef_migrations_history values ('20261031082752_InitialCatalogue', '10.0.14')`,
    );
    await pool.query(
      `insert into manufacturers (id, name, slug, is_demo, created_at, updated_at) values ('01a19114-eced-7a91-8515-a5d874d60a72', 'Existing Maker', 'existing-maker', false, now(), now())`,
    );
  });

  afterAll(async () => {
    await pool?.end();
    await admin(`drop database if exists "${dbName}" with (force)`);
  });

  it("records the baseline as applied, adds only new migrations and keeps data", async () => {
    const database = drizzle(pool, { schema });
    await migrateDatabase(database);

    const applied = await pool.query(`select hash from drizzle.__drizzle_migrations order by id`);
    expect(applied.rowCount).toBe(2); // baseline recorded + 0001_sessions applied
    expect((await pool.query(`select to_regclass('public.sessions') as t`)).rows[0].t).toBe("sessions");
    expect((await pool.query(`select name from manufacturers`)).rows).toEqual([{ name: "Existing Maker" }]);
    expect((await pool.query(`select count(*)::int as n from specification_definitions`)).rows[0].n).toBe(35);
    expect((await pool.query(`select count(*)::int as n from __ef_migrations_history`)).rows[0].n).toBe(1);

    // Idempotent: a second run changes nothing.
    await migrateDatabase(database);
    expect((await pool.query(`select count(*)::int as n from drizzle.__drizzle_migrations`)).rows[0].n).toBe(
      2,
    );
  });

  it("refuses to adopt an unexpected EF history", async () => {
    await pool.query(`truncate drizzle.__drizzle_migrations`);
    await pool.query(`insert into __ef_migrations_history values ('20990101000000_Unknown', '10.0.14')`);
    await expect(migrateDatabase(drizzle(pool, { schema }))).rejects.toThrow(
      /Unexpected EF Core migration history/,
    );
  });
});
