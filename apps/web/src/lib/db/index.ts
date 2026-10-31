import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
/** A database handle or an open transaction — services accept either. */
export type Executor = Pick<Database, "select" | "insert" | "update" | "delete" | "execute" | "transaction">;

interface DbState {
  pool: Pool;
  db: Database;
}

// One pool per server process (kept on globalThis so dev hot reloads don't leak connections).
const globalForDb = globalThis as unknown as { __motoscopeDb?: DbState };

/**
 * Lazily creates the connection pool on first use, so importing this module (e.g. during `next build`)
 * never connects. On serverless hosts point DATABASE_URL at a pooled endpoint (PgBouncer/Neon pooler)
 * and keep DATABASE_POOL_MAX small.
 */
export function db(): Database {
  if (!globalForDb.__motoscopeDb) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured. See README → Environment variables.");
    }
    const pool = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: Number(process.env.DATABASE_STATEMENT_TIMEOUT_MS ?? 30_000),
    });
    globalForDb.__motoscopeDb = { pool, db: drizzle(pool, { schema }) };
  }
  return globalForDb.__motoscopeDb.db;
}

/** Closes the pool (CLI scripts and tests). */
export async function closeDb(): Promise<void> {
  const state = globalForDb.__motoscopeDb;
  globalForDb.__motoscopeDb = undefined;
  await state?.pool.end();
}
