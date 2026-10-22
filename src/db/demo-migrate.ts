import { readFileSync } from "node:fs";
import { join } from "node:path";

import { sql } from "drizzle-orm";

import type { DB } from "./index";

/**
 * Applies ./drizzle to the demo database (PGlite). The journal table is our own: drizzle's
 * migrator is tied to the driver, and the real databases keep using scripts/migrate.ts.
 * `CREATE EXTENSION vector` is skipped: pgvector is not bundled with PGlite and no column uses it.
 */
export async function migrateDemo(db: DB, folder = "drizzle"): Promise<number> {
  await db.execute(sql.raw(`create table if not exists __demo_migrations (tag text primary key, applied_at timestamptz default now())`));
  const done = new Set(((await db.execute(sql.raw(`select tag from __demo_migrations`))).rows as { tag: string }[]).map((r) => r.tag));
  const journal = JSON.parse(readFileSync(join(folder, "meta", "_journal.json"), "utf8")) as { entries: { tag: string }[] };
  let applied = 0;
  for (const { tag } of journal.entries) {
    if (done.has(tag)) continue;
    for (const statement of readFileSync(join(folder, `${tag}.sql`), "utf8").split("--> statement-breakpoint")) {
      if (/CREATE EXTENSION[^;]*\bvector\b/i.test(statement) || !statement.replace(/--.*$/gm, "").trim()) continue;
      await db.execute(sql.raw(statement));
    }
    await db.execute(sql`insert into __demo_migrations (tag) values (${tag})`);
    applied++;
  }
  return applied;
}
