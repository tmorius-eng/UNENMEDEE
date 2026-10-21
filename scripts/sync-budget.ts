/**
 * Budget and public-money data for /budget, stored as small snapshots (indicator_snapshots):
 *   budget_nso        NSO/MoF: revenue, expenditure, balance since 1990; spending split;
 *                     revenue by tax type; government debt  (data.1212.mn)
 *   shilendans        this year's largest payees and spending categories (Шилэн данс)
 *   worldbank_tax     tax revenue, % of GDP (World Bank)
 *   audit_opinions    latest adverse / disclaimer / qualified audit opinions (audit.mn)
 *   soe_finance       state-owned companies' revenue, expenses, profit, wage fund, staff (Шилэн данс)
 *
 *   npm run budget:sync [-- --dry-run]
 * audit.mn needs NODE_EXTRA_CA_CERTS=certs/rapidssl-tls-rsa-ca-g1.pem (see src/lib/budget/audit.ts).
 */
import "dotenv/config";
import { parseArgs } from "node:util";

import { closeDb, getDb, hasDatabase } from "@/db";
import { indicatorSnapshots } from "@/db/schema";
import { fetchAuditOpinions } from "@/lib/budget/audit";
import { budgetHistory, type BudgetNsoSnapshot, fetchTable, governmentDebt, NSO_TABLES, revenueByType, spendingBreakdown } from "@/lib/budget/nso";
import { fetchShilendans } from "@/lib/budget/shilendans";
import { fetchSoeSnapshot } from "@/lib/soe/shilendans";
import { fetchTaxShare } from "@/lib/budget/worldbank";

const { values } = parseArgs({ options: { "dry-run": { type: "boolean", default: false } } });

const JOBS: { key: string; run: () => Promise<{ data: unknown; asOf: string | null; summary: string }> }[] = [
  {
    key: "budget_nso",
    run: async () => {
      const balance = await fetchTable(NSO_TABLES.balance);
      const purpose = await fetchTable(NSO_TABLES.byPurpose);
      const revenue = await fetchTable(NSO_TABLES.revenue);
      const debt = await fetchTable(NSO_TABLES.debt);
      const history = budgetHistory(balance);
      const data: BudgetNsoSnapshot = { history, spending: spendingBreakdown(purpose), revenue: revenueByType(revenue), debt: governmentDebt(debt), updated: { balance: balance.updated ?? null, purpose: purpose.updated ?? null, revenue: revenue.updated ?? null, debt: debt.updated ?? null } };
      const last = history.at(-1);
      return { data, asOf: last ? String(last.year) : null, summary: `${history.length} years, last ${last?.year}: revenue ${last?.revenue}, expenditure ${last?.expenditure} (million ₮)` };
    },
  },
  {
    key: "shilendans",
    run: async () => {
      const data = await fetchShilendans();
      return { data, asOf: data.to, summary: `${data.topPayees.length} payees, ${data.categories.length} categories (${data.from}…${data.to})` };
    },
  },
  {
    key: "worldbank_tax",
    run: async () => {
      const data = await fetchTaxShare();
      return { data, asOf: data.series.at(-1)?.label ?? null, summary: `${data.series.length} years of tax/GDP` };
    },
  },
  {
    key: "soe_finance",
    run: async () => {
      const data = await fetchSoeSnapshot();
      return { data, asOf: String(data.year), summary: `${data.companies.length} organisations, ${data.year}` };
    },
  },
  {
    key: "audit_opinions",
    run: async () => {
      const data = await fetchAuditOpinions(10);
      return { data, asOf: null, summary: `${data.reports.length} reports; totals ${JSON.stringify(data.totals)}` };
    },
  },
];

async function main() {
  const dryRun = values["dry-run"];
  if (!dryRun && !hasDatabase()) {
    console.error("✗ DATABASE_URL is not set. Use --dry-run to test without a database.");
    process.exitCode = 1;
    return;
  }
  let failed = 0;
  // Different hosts: run the jobs side by side (politeFetch throttles each host on its own).
  await Promise.all(
    JOBS.map(async (job) => {
      try {
        const { data, asOf, summary } = await job.run();
        console.log(`  ✓ ${job.key}: ${summary} (${JSON.stringify(data).length} B)`);
        if (dryRun) return;
        const row = { key: job.key, data, asOf, updatedAt: new Date() };
        await getDb().insert(indicatorSnapshots).values(row).onConflictDoUpdate({ target: indicatorSnapshots.key, set: row });
      } catch (err) {
        failed++;
        console.error(`  ✗ ${job.key}: ${err instanceof Error ? err.message : err} (previous snapshot kept)`);
      }
    }),
  );
  if (failed === JOBS.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
