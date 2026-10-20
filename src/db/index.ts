import { attachDatabasePool } from "@vercel/functions";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;

declare global {
  // Reuse the pool across Next.js dev hot reloads.
  var __iltodDb: { db: DB; pool: Pool } | undefined;
}

/** True when a database is configured. Pages use this to render empty states without a DB. */
export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function isLocalDatabase(url: string): boolean {
  try {
    return ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Lazy database singleton. Throws only when actually used without DATABASE_URL,
 * so `next build` and unit tests work without secrets.
 *
 * node-postgres runs one query per connection at a time. postgres.js pipelines concurrent
 * queries on a connection, which the Supabase transaction pooler (Supavisor, port 6543)
 * left hanging on Vercel (pages rendered empty after the query timeout).
 */
export function getDb(): DB {
  if (globalThis.__iltodDb) return globalThis.__iltodDb.db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  const pool = new Pool({
    connectionString: url,
    // Supabase requires TLS; its pooler certificate is not in Node's default CA store.
    ssl: isLocalDatabase(url) ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_MAX ?? 3),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    // Client-side cap: a stuck query errors instead of holding a connection forever.
    query_timeout: 20_000,
  });
  // An idle client losing its connection must not crash the process.
  pool.on("error", (err) => console.error("[db] idle client error:", err.message));
  // Vercel Fluid compute: keep the instance alive until idle connections are closed.
  if (process.env.VERCEL) attachDatabasePool(pool);
  const db = drizzle(pool, { schema });
  globalThis.__iltodDb = { db, pool };
  return db;
}

/** Close the pool (used by CLI scripts so the process can exit). */
export async function closeDb(): Promise<void> {
  if (globalThis.__iltodDb) {
    await globalThis.__iltodDb.pool.end();
    globalThis.__iltodDb = undefined;
  }
}

export { schema };
