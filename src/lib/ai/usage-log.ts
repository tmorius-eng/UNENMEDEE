import { gte, sql } from "drizzle-orm";

import type { DB } from "@/db";
import { aiUsageLogs, transparencyLedger } from "@/db/schema";

import { createBudgetGuard, type BudgetGuard, type UsageSnapshot } from "./limits";
import type { UsageLogger } from "./router";

/** Logs every LLM call to `ai_usage_logs` (CLAUDE.md rule #4). */
export function dbUsageLogger(db: DB): UsageLogger {
  return async (r) => {
    await db.insert(aiUsageLogs).values({
      provider: r.provider,
      model: r.model,
      purpose: r.purpose,
      articleId: r.articleId ?? null,
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      estimatedCostUsd: r.estimatedCostUsd.toFixed(6),
      success: r.success,
    });
  };
}

/** Prints usage instead of storing it (dry runs). */
export const consoleUsageLogger: UsageLogger = async (r) => {
  console.log(
    `   💸 ${r.provider}/${r.model} [${r.purpose}] in=${r.promptTokens} out=${r.completionTokens} $${r.estimatedCostUsd.toFixed(6)}${r.success ? "" : " (failed)"}`,
  );
};

export function monthKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 7);
}

/**
 * Recomputes this month's AI spend from ai_usage_logs and upserts it into the ledger.
 * Idempotent: safe to run after every batch.
 */
export async function syncLedgerAiCost(db: DB, month: string = monthKey()): Promise<number> {
  const [row] = await db
    .select({ total: sql<string>`coalesce(sum(${aiUsageLogs.estimatedCostUsd}), 0)` })
    .from(aiUsageLogs)
    .where(sql`to_char(${aiUsageLogs.createdAt} at time zone 'UTC', 'YYYY-MM') = ${month}`);
  const total = Number(row?.total ?? 0);
  await db
    .insert(transparencyLedger)
    .values({ month, aiCostUsd: total.toFixed(6), infraCostUsd: "0" })
    .onConflictDoUpdate({ target: transparencyLedger.month, set: { aiCostUsd: total.toFixed(6) } });
  return total;
}

/** Current month / UTC-day spend and today's call counts per provider, from ai_usage_logs. */
export async function loadUsageSnapshot(db: DB): Promise<UsageSnapshot> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const [[month], perProvider] = await Promise.all([
    // gte() maps the Date through the column type; a raw sql`` param would reach the driver as a Date and fail.
    db.select({ usd: sql<string>`coalesce(sum(${aiUsageLogs.estimatedCostUsd}), 0)` }).from(aiUsageLogs).where(gte(aiUsageLogs.createdAt, monthStart)),
    db
      .select({
        provider: aiUsageLogs.provider,
        calls: sql<number>`count(*)::int`,
        usd: sql<string>`coalesce(sum(${aiUsageLogs.estimatedCostUsd}), 0)`,
      })
      .from(aiUsageLogs)
      .where(gte(aiUsageLogs.createdAt, dayStart))
      .groupBy(aiUsageLogs.provider),
  ]);
  const dayCalls: UsageSnapshot["dayCalls"] = {};
  let dayUsd = 0;
  for (const r of perProvider) {
    dayCalls[r.provider] = r.calls;
    dayUsd += Number(r.usd);
  }
  return { monthUsd: Number(month?.usd ?? 0), dayUsd, dayCalls };
}

/** Budget guard backed by the real spend in ai_usage_logs. */
export function dbBudgetGuard(db: DB): BudgetGuard {
  return createBudgetGuard(() => loadUsageSnapshot(db));
}
