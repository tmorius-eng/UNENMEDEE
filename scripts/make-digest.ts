/**
 * AI news digest ("Онцлох тойм").
 *
 *   npm run digest                     # 12-hour edition (skipped if one was made < 6 h ago)
 *   npm run digest -- --kind 30d       # catch-up review of the last 30 days
 *   npm run digest -- --force          # make a new edition anyway
 *
 * Uses the same free-first provider chain and budget guard as ai:process; falls back to a
 * rule-based ranking when no AI provider is available, so an edition always appears.
 */
import "dotenv/config";
import { parseArgs } from "node:util";

import { closeDb, getDb, hasDatabase } from "@/db";
import { createDigest, type DigestKind } from "@/lib/ai/digest";
import { dbBudgetGuard, dbUsageLogger, syncLedgerAiCost } from "@/lib/ai/usage-log";

const { values } = parseArgs({
  options: {
    kind: { type: "string", default: "12h" },
    force: { type: "boolean", default: false },
  },
});

async function main() {
  if (!hasDatabase()) {
    console.error("✗ DATABASE_URL is not set.");
    process.exitCode = 1;
    return;
  }
  const kind = values.kind === "30d" ? "30d" : ("12h" satisfies DigestKind);
  const db = getDb();
  const res = await createDigest(db, { kind, force: values.force, log: dbUsageLogger(db), budget: dbBudgetGuard(db) });
  if (res.status !== "created" || !res.digest) {
    console.log(`⏭  No ${kind} digest: ${res.reason}`);
    return;
  }
  const d = res.digest;
  console.log(`📰 ${d.title}  (${d.items.length}/${d.candidateCount} stories, ${d.generatedBy}, $${Number(d.costUsd).toFixed(6)})`);
  console.log(`   ${d.intro}`);
  for (const [i, it] of d.items.entries()) console.log(`   ${String(i + 1).padStart(2)}. ${it.headline}  [#${it.articleId} ${it.sourceName}]`);
  await syncLedgerAiCost(db);
}

main()
  .catch((err) => {
    console.error("✗ Digest failed:", err);
    process.exitCode = 1;
  })
  .finally(closeDb);
