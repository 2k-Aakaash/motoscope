// Applies Drizzle migrations (adopting databases created by the former EF Core backend) and reference data.
// Safe in every environment: non-destructive and idempotent.   Usage: npm run db:migrate
import "./env.mts";
import { closeDb, db } from "@/lib/db";
import { migrateDatabase } from "@/lib/db/migrate";

try {
  await migrateDatabase(db());
  console.log("Database migrated and reference data applied.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
