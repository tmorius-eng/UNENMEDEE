import { politeFetch } from "@/lib/scraper/http";

import { readJsonStat, type JsonStat2 } from "./jsonstat";

/**
 * National Statistics Office PX-Web API (data.1212.mn), source: Ministry of Finance.
 * All amounts are million ₮ (сая төгрөг) as published.
 */
const BUDGET = "https://data.1212.mn/api/v1/mn/NSO/Economy,%20environment/Government%20budget";
export const NSO_TABLES = {
  balance: `${BUDGET}/DT_NSO_0800_001V1.px`,
  byPurpose: `${BUDGET}/DT_NSO_0800_001V3.px`,
  revenue: `${BUDGET}/DT_NSO_0800_003V1.px`,
  debt: `${BUDGET}/DT_NSO_0700_028V1.px`,
};
export const NSO_SOURCE_URL = "https://www.1212.mn/mn/statistic/statcate/573051/table-view/DT_NSO_0800_001V1";

/** POSTs a PX-Web query (the whole table by default; pass a filtered body for big tables). */
export async function fetchTable(url: string, body: unknown = { query: [], response: { format: "json-stat2" } }): Promise<JsonStat2> {
  const res = await politeFetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`data.1212.mn returned HTTP ${res.status} for ${url.split("/").pop()}`);
  return (await res.json()) as JsonStat2;
}

export interface BudgetYear {
  year: number;
  revenue: number | null;
  expenditure: number | null;
  balance: number | null;
}

/** Revenue / expenditure / balance per year since `from` (actual results, million ₮). */
export function budgetHistory(ds: JsonStat2, from = 1990): BudgetYear[] {
  const byYear = new Map<number, BudgetYear>();
  for (const r of readJsonStat(ds)) {
    const year = Number(r.keys["Он"]);
    if (!Number.isFinite(year) || year < from) continue;
    const row = byYear.get(year) ?? { year, revenue: null, expenditure: null, balance: null };
    const kind = r.keys["Үзүүлэлт"];
    if (kind === "Орлого") row.revenue = r.value;
    else if (kind === "Зарлага") row.expenditure = r.value;
    else if (kind === "Тэнцэл") row.balance = r.value;
    byYear.set(year, row);
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

export interface CategorySeries {
  code: string;
  name: string;
  values: Record<string, number | null>;
}

export interface CategoryTable {
  years: string[];
  total: Record<string, number | null>;
  categories: CategorySeries[];
}

function table(ds: JsonStat2, catDim: string, yearDim: string, keep: (code: string) => boolean, totalCode: string): CategoryTable {
  const rows = readJsonStat(ds);
  const years = [...new Set(rows.map((r) => r.keys[yearDim]))].sort();
  const total: Record<string, number | null> = {};
  const cats = new Map<string, CategorySeries>();
  for (const r of rows) {
    const code = r.codes[catDim];
    const year = r.keys[yearDim];
    if (code === totalCode) total[year] = r.value;
    if (!keep(code)) continue;
    const c = cats.get(code) ?? { code, name: r.keys[catDim].trim().replace(/\s+/g, " "), values: {} };
    c.values[year] = r.value;
    cats.set(code, c);
  }
  return { years, total, categories: [...cats.values()] };
}

/**
 * Where the money goes (DT_NSO_0800_001V3). Codes 2–14 are the economic split (wages and
 * operations, pension and welfare transfers, investment, debt service, ...); together with the
 * targeted "арга хэмжээ" programmes (codes 15–32, by purpose: education, health, ...) they add up
 * to the total (code 1). The programme lines alone are NOT total health or education spending,
 * so they are shown separately and labelled as programmes.
 */
const ECONOMIC_CODES = new Set(Array.from({ length: 13 }, (_, i) => String(2 + i)));
const PROGRAMME_CODES = new Set(Array.from({ length: 18 }, (_, i) => String(15 + i)));

export interface SpendingTables {
  economic: CategoryTable;
  programmes: CategoryTable;
}

export function spendingBreakdown(ds: JsonStat2): SpendingTables {
  const economic = table(ds, "Зарлагын төрөл", "Жил", (c) => ECONOMIC_CODES.has(c), "1");
  const programmes = table(ds, "Зарлагын төрөл", "Жил", (c) => PROGRAMME_CODES.has(c), "1");
  // One line for all programmes, so the economic split adds up to the total.
  const sum: Record<string, number | null> = {};
  for (const y of programmes.years) sum[y] = programmes.categories.reduce((a, c) => a + (c.values[y] ?? 0), 0);
  economic.categories.push({ code: "15-32", name: "Зорилтот арга хэмжээ, хөтөлбөр (доор задлав)", values: sum });
  return { economic, programmes: { ...programmes, total: sum } };
}

/**
 * Revenue by type (DT_NSO_0800_003V1). Codes 7, 8 (income taxes), 11–30 (other taxes), 31–33
 * (non-tax, capital, grants) add up to the balanced revenue (code 4), the same figure as the
 * history's "Орлого". The mining-revenue funds (codes 1–3: Stabilization, Future Heritage,
 * Savings) come on top of it to make the total (code 0).
 */
const REVENUE_CODES = new Set(["7", "8", "11", "12", "14", "18", "26", "27", "30", "31", "32", "33"]);
const FUND_CODES = new Set(["1", "2", "3"]);

export interface RevenueTable extends CategoryTable {
  funds: CategorySeries[];
}

export function revenueByType(ds: JsonStat2, from = 2010): RevenueTable {
  const t = table(ds, "Үзүүлэлт", "Он", (c) => REVENUE_CODES.has(c), "4");
  const funds = table(ds, "Үзүүлэлт", "Он", (c) => FUND_CODES.has(c), "0").categories;
  const years = t.years.filter((y) => Number(y) >= from);
  return { years, total: t.total, categories: t.categories, funds };
}

/** Total government debt per quarter (DT_NSO_0700_028V1, code 0), billion ₮ as published. */
export function governmentDebt(ds: JsonStat2): { label: string; value: number }[] {
  return readJsonStat(ds)
    .filter((r) => r.codes[ds.id[0]] === "0" && r.value !== null)
    .map((r) => ({ label: r.keys[ds.id[1]], value: r.value as number }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** What `npm run budget:sync` stores under indicator_snapshots key "budget_nso". */
export interface BudgetNsoSnapshot {
  history: BudgetYear[];
  spending: SpendingTables;
  revenue: RevenueTable;
  debt: { label: string; value: number }[];
  updated: Record<"balance" | "purpose" | "revenue" | "debt", string | null>;
}
