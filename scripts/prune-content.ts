/**
 * Keeps the free 500 MB database from filling up: articles older than RETENTION_DAYS keep their
 * title, AI summary, facts, entities, source link and SHA-256 hash, but the body is cut to an
 * EXCERPT_CHARS excerpt (the article page says so and links the original). Postgres reuses the
 * freed space through autovacuum, so the database stops growing at roughly one retention window.
 *
 *   npm run db:prune                 # RETENTION_DAYS=180 by default
 *   npm run db:prune -- --dry-run
 */
import "dotenv/config";
import { parseArgs } from "node:util";

import { sql } from "drizzle-orm";

import { closeDb, getDb, hasDatabase } from "@/db";

const { values } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } } });
const RETENTION_DAYS = Math.max(30, Number(process.env.RETENTION_DAYS ?? 180));
const EXCERPT_CHARS = 600;

async function main() {
  if (!hasDatabase()) {
    console.error("✗ DATABASE_URL is not set.");
    process.exitCode = 1;
    return;
  }
  const db = getDb();
  const where = sql`content_pruned_at is null and coalesce(published_at, created_at) < now() - make_interval(days => ${RETENTION_DAYS}) and length(clean_content) > ${EXCERPT_CHARS}`;
  const [{ n, bytes }] = (await db.execute(sql`select count(*)::int as n, coalesce(sum(length(clean_content)), 0)::bigint as bytes from articles where ${where}`)).rows as { n: number; bytes: string }[];
  console.log(`✂️  ${n} article(s) older than ${RETENTION_DAYS} days to cut to ${EXCERPT_CHARS} characters (~${Math.round(Number(bytes) / 1024)} KB of text).`);
  if (values["dry-run"] || n === 0) return;
  await db.execute(sql`update articles set clean_content = left(clean_content, ${EXCERPT_CHARS}), content_pruned_at = now() where ${where}`);
  const [{ size }] = (await db.execute(sql`select pg_size_pretty(pg_database_size(current_database())) as size`)).rows as { size: string }[];
  console.log(`✓ Done. Database size: ${size} (space is reused after autovacuum).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
