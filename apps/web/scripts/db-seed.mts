// DEVELOPMENT ONLY: inserts the demo catalogue (fictional brands). Refuses to run in production.
// Usage: npm run db:seed            (skips if demo data exists)
//        npm run db:seed -- --reset (rebuilds demo rows only; real data is untouched)
import "./env.mts";
import { closeDb, db } from "@/lib/db";
import { seedDemoData } from "@/lib/db/seed/demo";
import { seedReferenceData } from "@/lib/db/seed/reference";

try {
  await seedReferenceData(db());
  const result = await seedDemoData(db(), { reset: process.argv.includes("--reset") });
  console.log(
    result === "seeded" ? "Demo data seeded." : "Demo data already present (use --reset to rebuild).",
  );
} catch (error) {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
