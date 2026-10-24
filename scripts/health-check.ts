/**
 * Daily watchdog (`.github/workflows/watchdog.yml`): exits 1 with a list of problems when the
 * site stopped getting news, AI summaries or digests, or the free database is filling up.
 * The workflow then opens a GitHub issue, which emails the repository owner.
 *
 *   npm run health
 */
import "dotenv/config";

import { sql } from "drizzle-orm";

import { closeDb, getDb, hasDatabase } from "@/db";

const DB_LIMIT_MB = 500;

async function main() {
  if (!hasDatabase()) {
    console.error("✗ DATABASE_URL is not set.");
    process.exitCode = 1;
    return;
  }
  const db = getDb();
  const [r] = (
    await db.execute(sql`select
      extract(epoch from now() - (select max(created_at) from articles)) / 3600 as hours_since_article,
      extract(epoch from now() - (select max(created_at) from articles where tldr_summary is not null and not summary_fallback)) / 3600 as hours_since_ai,
      extract(epoch from now() - (select max(created_at) from digests)) / 3600 as hours_since_digest,
      (select count(*) from articles where tldr_summary is null)::int as ai_backlog,
      (select count(*) from sources where is_active)::int as active_sources,
      (select count(*) from sources where is_active and consecutive_failures > 0)::int as failing_sources,
      (select count(*) from push_subscriptions)::int as push_subs,
      (select count(*) from push_subscriptions where failures >= 3)::int as push_failing,
      pg_database_size(current_database()) / 1048576.0 as db_mb`)
  ).rows as Record<string, number | string | null>[];
  const num = (v: unknown) => (v === null || v === undefined ? Infinity : Number(v));
  const problems: string[] = [];
  if (num(r.hours_since_article) > 26) problems.push(`Шинэ мэдээ ${Math.round(num(r.hours_since_article))} цаг орж ирээгүй (scrape ажиллахгүй байж магадгүй).`);
  if (num(r.hours_since_ai) > 36) problems.push(`AI хураангуй ${Math.round(num(r.hours_since_ai))} цаг гараагүй (AI түлхүүр, лимит шалгах). Хүлээгдэж буй: ${r.ai_backlog}.`);
  if (num(r.hours_since_digest) > 26) problems.push(`Онцлох тойм ${Math.round(num(r.hours_since_digest))} цаг гараагүй.`);
  const failing = Number(r.failing_sources) / Math.max(1, Number(r.active_sources));
  if (failing > 0.6) problems.push(`Эх сурвалжийн ${Math.round(failing * 100)}% алдаатай (${r.failing_sources}/${r.active_sources}).`);
  const pushSubs = Number(r.push_subs);
  if (pushSubs >= 5 && Number(r.push_failing) > pushSubs / 2) problems.push(`Push мэдэгдэл: ${r.push_failing}/${pushSubs} захиалга дараалан алдаатай (VAPID түлхүүр, push үйлчилгээ шалгах).`);
  if (Number(r.db_mb) > DB_LIMIT_MB * 0.8) problems.push(`Өгөгдлийн сан ${Math.round(Number(r.db_mb))} MB / ${DB_LIMIT_MB} MB: RETENTION_DAYS-ийг багасгах.`);

  console.log(
    `articles ${Math.round(num(r.hours_since_article))} h ago · AI ${Math.round(num(r.hours_since_ai))} h ago · digest ${Math.round(num(r.hours_since_digest))} h ago · backlog ${r.ai_backlog} · sources ${r.failing_sources}/${r.active_sources} failing · push ${r.push_failing}/${r.push_subs} failing · DB ${Math.round(Number(r.db_mb))} MB`,
  );
  if (problems.length) {
    for (const p of problems) console.log(`- ${p}`);
    process.exitCode = 1;
  } else {
    console.log("✓ Healthy");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
