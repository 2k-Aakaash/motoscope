import { defineConfig } from "drizzle-kit";

// Used by drizzle-kit to generate migrations from src/lib/db/schema.ts. Apply them with `npm run db:migrate`
// (scripts/db-migrate.ts), which also adopts databases created by the former EF Core backend.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
