/**
 * Applies the SQL migrations in ./drizzle (same journal table as drizzle-kit:
 * drizzle.__drizzle_migrations).
 *
 * Replaces `drizzle-kit migrate`, which hides connection errors behind a spinner and
 * uses prepared statements that the Supabase transaction pooler (port 6543) rejects.
 */
import "dotenv/config";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { isLocalDatabase } from "@/db";

/** Host, port and user only, so logs help debug a wrong secret without leaking the password. */
function describe(url: string): string {
  try {
    const u = new URL(url);
    return `${u.username || "?"}@${u.hostname}:${u.port || "5432"}${u.pathname}`;
  } catch {
    return "an unparseable DATABASE_URL (check for unencoded special characters in the password)";
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("✗ DATABASE_URL is not set.");
    process.exitCode = 1;
    return;
  }
  console.log(`🗄  Migrating ${describe(url)} …`);
  const client = postgres(url, { max: 1, prepare: false, ssl: isLocalDatabase(url) ? false : "require", onnotice: () => {}, connect_timeout: 30 });
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
    const [last] = await client`select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1`;
    console.log(`✓ Migrations up to date (latest ${last ? new Date(Number(last.created_at)).toISOString() : "none"}).`);
  } catch (err) {
    // drizzle wraps driver errors ("Failed query: …"); the reason is in `cause`.
    const outer = err as { message?: string; cause?: { message?: string; code?: string } };
    const e = { message: [outer.message, outer.cause?.message].filter(Boolean).join(" ← "), code: outer.cause?.code ?? (err as { code?: string }).code };
    console.error(`✗ Migration failed: ${e.code ? `[${e.code}] ` : ""}${e.message || String(err)}`);
    if (/password authentication failed|28P01/.test(`${e.message} ${e.code}`)) console.error("  → The password in DATABASE_URL is wrong.");
    if (/ENOTFOUND|getaddrinfo/.test(e.message ?? "")) console.error("  → The host in DATABASE_URL does not resolve. Copy it again from Supabase → Connect.");
    if (/Tenant or user not found/.test(e.message ?? "")) console.error("  → Wrong pooler host or user: use the exact string from Supabase → Connect → Transaction pooler.");
    process.exitCode = 1;
  } finally {
    await client.end({ timeout: 5 });
  }
}

main();
