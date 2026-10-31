import { sql } from "drizzle-orm";

export const PASSWORD = "Integration-Test-Password-1";
export const ADMIN = "admin@test.motoscope.local";
export const EDITOR = "editor@test.motoscope.local";
export const MODERATOR = "moderator@test.motoscope.local";
export const LOCKOUT_USER = "lockout@test.motoscope.local";

/**
 * Resets the test database once per run: drops the public and drizzle schemas, applies all migrations from scratch,
 * reference data, the demo seed, and staff users. Only ever point MOTOSCOPE_TEST_DB at a disposable database.
 */
export default async function setup() {
  const url = process.env.MOTOSCOPE_TEST_DB;
  if (!url) return;
  process.env.DATABASE_URL = url;

  const { db, closeDb } = await import("@/lib/db");
  const { migrateDatabase } = await import("@/lib/db/migrate");
  const { seedDemoData } = await import("@/lib/db/seed/demo");
  const { createStaffUser } = await import("@/lib/auth/staff");

  await db().execute(sql`drop schema if exists drizzle cascade`);
  await db().execute(sql`drop schema if exists public cascade`);
  await db().execute(sql`create schema public`);
  await migrateDatabase(db());
  await seedDemoData(db(), { reset: false });
  for (const [email, role] of [
    [ADMIN, "Admin"],
    [EDITOR, "Editor"],
    [MODERATOR, "Moderator"],
    [LOCKOUT_USER, "Editor"],
  ] as const) {
    await createStaffUser({ email, password: PASSWORD, role });
  }
  await closeDb();
}
