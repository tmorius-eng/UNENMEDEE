import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type DB = PostgresJsDatabase<typeof schema>;

declare global {
  // Reuse the client across Next.js dev hot reloads.
  var __iltodDb: { db: DB; client: postgres.Sql } | undefined;
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
 */
export function getDb(): DB {
  if (globalThis.__iltodDb) return globalThis.__iltodDb.db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  const client = postgres(url, {
    // Supabase transaction pooler (port 6543) does not support prepared statements.
    prepare: false,
    // Supabase recommends SSL; local Postgres (dev/tests) usually has none.
    ssl: isLocalDatabase(url) ? false : "require",
    max: Number(process.env.DB_POOL_MAX ?? 3),
    idle_timeout: 20,
    connect_timeout: 15,
  });
  const db = drizzle(client, { schema });
  globalThis.__iltodDb = { db, client };
  return db;
}

/** Close the pool (used by CLI scripts so the process can exit). */
export async function closeDb(): Promise<void> {
  if (globalThis.__iltodDb) {
    await globalThis.__iltodDb.client.end({ timeout: 5 });
    globalThis.__iltodDb = undefined;
  }
}

export { schema };
