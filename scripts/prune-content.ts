/**
 * Keeps the free 500 MB database from filling up: articles older than RETENTION_DAYS keep their
 * title, AI summary, facts, entities, source link and SHA-256 hash, but the body is cut to an
 * EXCERPT_CHARS excerpt (the article page says so and links the original). Postgres reuses the
 * freed space through autovacuum, so the database stops growing at roughly one retention window.
 *
 * It also stores headlines still in capitals in sentence case (`unshoutTitle`, which the scraper
 * applies to new articles since Oct 2026); slugs stay, so every URL keeps working.
 *
 *   npm run db:prune                 # RETENTION_DAYS=180 by default
 *   npm run db:prune -- --dry-run
 */
import "dotenv/config";
import { parseArgs } from "node:util";

import { sql } from "drizzle-orm";

import { closeDb, getDb, hasDatabase } from "@/db";
import { unshoutTitle } from "@/lib/scraper/titles";

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
  await fixShoutingTitles(db);
  const where = sql`content_pruned_at is null and coalesce(published_at, created_at) < now() - make_interval(days => ${RETENTION_DAYS}) and length(clean_content) > ${EXCERPT_CHARS}`;
  const [{ n, bytes }] = (await db.execute(sql`select count(*)::int as n, coalesce(sum(length(clean_content)), 0)::bigint as bytes from articles where ${where}`)).rows as { n: number; bytes: string }[];
  console.log(`✂️  ${n} article(s) older than ${RETENTION_DAYS} days to cut to ${EXCERPT_CHARS} characters (~${Math.round(Number(bytes) / 1024)} KB of text).`);
  if (values["dry-run"] || n === 0) return;
  await db.execute(sql`update articles set clean_content = left(clean_content, ${EXCERPT_CHARS}), content_pruned_at = now() where ${where}`);
  const [{ size }] = (await db.execute(sql`select pg_size_pretty(pg_database_size(current_database())) as size`)).rows as { size: string }[];
  console.log(`✓ Done. Database size: ${size} (space is reused after autovacuum).`);
}

async function fixShoutingTitles(db: ReturnType<typeof getDb>) {
  const rows = (await db.execute(sql`select id, title from articles where title = upper(title) and title ~ '[А-ЯӨҮЁ]{3}'`)).rows as { id: number; title: string }[];
  const changes = rows.map((r) => ({ id: r.id, from: r.title, to: unshoutTitle(r.title) })).filter((c) => c.to !== c.from);
  console.log(`🔡 ${changes.length} headline(s) in capitals to store in sentence case.`);
  for (const c of changes.slice(0, 5)) console.log(`   ${c.from}\n → ${c.to}`);
  if (values["dry-run"]) return;
  for (const c of changes) await db.execute(sql`update articles set title = ${c.to} where id = ${c.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
