/**
 * Push notifications for subscribers ("Мэдэгдэл авах").
 *
 *   npm run push:send -- --mode news     # important news analyzed in the last day (after ai:process)
 *   npm run push:send -- --mode digest   # the newest digest edition (after npm run digest)
 *   npm run push:send -- --mode news --dry-run
 *
 * News: importance >= 75 or a risk flag, published in the last 24 h, never notified before.
 * At most 3 stories per run get their own notification; the rest become one "N more" alert.
 */
import "dotenv/config";
import { parseArgs } from "node:util";

import { and, desc, eq, gte, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";

import { closeDb, getDb, hasDatabase } from "@/db";
import { appSettings, articles, digests, sources } from "@/db/schema";
import { articlePayload, digestPayload, moreNewsPayload, type PushPayload } from "@/lib/push/core";
import { sendToAll } from "@/lib/push/server";

const { values } = parseArgs({
  options: {
    mode: { type: "string", default: "news" },
    "dry-run": { type: "boolean", default: false },
  },
});

const IMPORTANCE_MIN = Number(process.env.PUSH_IMPORTANCE_MIN ?? 75);
const MAX_SINGLE = 3;
const LAST_DIGEST_KEY = "push_last_digest_id";

async function newsPayloads(): Promise<{ payloads: PushPayload[]; ids: number[] }> {
  const db = getDb();
  const rows = await db
    .select({ id: articles.id, slug: articles.slug, title: articles.title, tldr: articles.tldrSummary, sourceName: sources.name, riskFlag: articles.riskFlag })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(
      and(
        eq(articles.isPublished, true),
        isNotNull(articles.tldrSummary),
        isNull(articles.notifiedAt),
        gte(articles.publishedAt, new Date(Date.now() - 24 * 3_600_000)),
        or(gte(articles.importanceScore, IMPORTANCE_MIN), eq(articles.riskFlag, true)),
      ),
    )
    .orderBy(sql`${articles.importanceScore} desc nulls last`, desc(articles.riskScore))
    .limit(50);
  const payloads = rows.slice(0, MAX_SINGLE).map(articlePayload);
  if (rows.length > MAX_SINGLE) payloads.push(moreNewsPayload(rows.length - MAX_SINGLE));
  return { payloads, ids: rows.map((r) => r.id) };
}

async function digestPayloads(): Promise<{ payloads: PushPayload[]; digestId: number | null }> {
  const db = getDb();
  const [latest] = await db
    .select()
    .from(digests)
    .where(gte(digests.createdAt, new Date(Date.now() - 3 * 3_600_000)))
    .orderBy(desc(digests.createdAt))
    .limit(1);
  if (!latest) return { payloads: [], digestId: null };
  const [last] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, LAST_DIGEST_KEY));
  if (last && Number(last.value) >= latest.id) return { payloads: [], digestId: null };
  return { payloads: [digestPayload(latest)], digestId: latest.id };
}

async function main() {
  if (!hasDatabase()) {
    console.error("✗ DATABASE_URL is not set.");
    process.exitCode = 1;
    return;
  }
  const db = getDb();
  const mode = values.mode === "digest" ? "digest" : "news";
  const plan = mode === "digest" ? await digestPayloads() : await newsPayloads();
  if (plan.payloads.length === 0) {
    console.log(`🔕 Nothing new to notify (${mode}).`);
    return;
  }
  for (const p of plan.payloads) console.log(`  → ${p.title} | ${p.body} | ${p.url}`);
  if (values["dry-run"]) return;

  const res = await sendToAll(db, plan.payloads);
  // Mark as notified even with zero subscribers: future subscribers should not get a backlog.
  if ("ids" in plan && plan.ids.length) await db.update(articles).set({ notifiedAt: new Date() }).where(inArray(articles.id, plan.ids));
  if ("digestId" in plan && plan.digestId !== null) {
    await db
      .insert(appSettings)
      .values({ key: LAST_DIGEST_KEY, value: String(plan.digestId) })
      .onConflictDoUpdate({ target: appSettings.key, set: { value: String(plan.digestId), updatedAt: new Date() } });
  }
  console.log(`🔔 ${mode}: ${res.sent} notification(s) sent, ${res.failed} failed, ${res.removed} dead subscription(s) removed.`);
}

main()
  .catch((err) => {
    console.error("✗ Push failed:", err);
    process.exitCode = 1;
  })
  .finally(closeDb);
