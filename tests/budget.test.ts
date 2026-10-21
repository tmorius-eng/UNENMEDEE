import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { parseAuditList } from "@/lib/budget/audit";
import { GOVERNMENTS, governmentsInYear } from "@/lib/budget/governments";
import { readJsonStat, type JsonStat2 } from "@/lib/budget/jsonstat";
import { budgetHistory, revenueByType, spendingBreakdown } from "@/lib/budget/nso";
import { parseCategories, parseTopPayees } from "@/lib/budget/shilendans";
import { parseWorldBank } from "@/lib/budget/worldbank";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/budget/${name}`, import.meta.url), "utf8");
const json = (name: string) => JSON.parse(fixture(name)) as unknown;
const sum = (xs: (number | null | undefined)[]) => xs.reduce<number>((a, x) => a + (x ?? 0), 0);
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1, `${a} ≈ ${b}`);

describe("JSON-stat 2.0 reader", () => {
  it("decodes row-major values (last dimension fastest)", () => {
    const ds: JsonStat2 = {
      id: ["A", "B"],
      size: [2, 3],
      value: [1, 2, 3, 4, 5, 6],
      dimension: {
        A: { category: { index: { x: 0, y: 1 }, label: { x: "X", y: "Y" } } },
        B: { category: { index: ["p", "q", "r"] } },
      },
    };
    const rows = readJsonStat(ds);
    assert.equal(rows.length, 6);
    assert.deepEqual(rows[1], { keys: { A: "X", B: "q" }, codes: { A: "x", B: "q" }, value: 2 });
    assert.deepEqual(rows[5].keys, { A: "Y", B: "r" });
  });
});

describe("NSO budget tables", () => {
  it("reads revenue, expenditure and balance since 1990", () => {
    const h = budgetHistory(json("nso-balance.json") as JsonStat2);
    assert.equal(h[0].year, 1990);
    const y2025 = h.find((y) => y.year === 2025)!;
    assert.deepEqual(y2025, { year: 2025, revenue: 30303163.2, expenditure: 31331032.5, balance: -1027869.3 });
    // Years are unique and sorted.
    assert.deepEqual(
      h.map((y) => y.year),
      [...new Set(h.map((y) => y.year))].sort((a, b) => a - b),
    );
  });

  it("the economic spending split adds up to the total", () => {
    const { economic, programmes } = spendingBreakdown(json("nso-purpose.json") as JsonStat2);
    for (const y of economic.years) {
      const total = economic.total[y];
      if (total === null || total === undefined) continue;
      // The published 2020 lines exceed the published total by 0.4%; every other year matches.
      const s = sum(economic.categories.map((c) => c.values[y]));
      assert.ok(Math.abs(s / total - 1) < 0.005, `${y}: ${s} vs ${total}`);
    }
    close(sum(economic.categories.map((c) => c.values["2025"])), 31289204.3);
    // Programmes are listed separately and are only part of the total.
    assert.ok((programmes.total["2025"] ?? 0) < (economic.total["2025"] ?? 0));
    assert.ok(programmes.categories.some((c) => c.name.startsWith("Боловсрол")));
  });

  it("revenue lines add up to the balanced revenue (the history's Орлого)", () => {
    const r = revenueByType(json("nso-revenue.json") as JsonStat2);
    assert.equal(r.years[0], "2010");
    close(r.total["2025"] as number, 30303163.2);
    close(sum(r.categories.map((c) => c.values["2025"])), 30303163.2);
    assert.deepEqual(
      r.funds.map((f) => f.name),
      ["Тогтворжуулалтын сан", "Ирээдүйн өв сан", "Хуримтлалын сан"],
    );
  });
});

describe("Шилэн данс", () => {
  it("parses the top payees", () => {
    const top = parseTopPayees(json("shilendans-top.json"));
    assert.equal(top.length, 10);
    assert.equal(top[0].registerNo, "7185857");
    assert.equal(top[0].amount, 148_000_000_000);
  });

  it("parses spending categories, largest first, zeros dropped", () => {
    const cats = parseCategories(json("shilendans-eza.json"));
    assert.ok(cats.length > 0);
    assert.ok(cats.every((c) => c.amount > 0));
    assert.ok(cats.every((c, i) => i === 0 || cats[i - 1].amount >= c.amount));
  });
});

describe("World Bank tax share", () => {
  it("drops empty years and sorts by year", () => {
    const wb = parseWorldBank(json("worldbank-tax.json"));
    assert.ok(wb.series.length > 20);
    assert.ok(wb.series.every((p) => Number.isFinite(p.value)));
    assert.ok(wb.series.every((p, i) => i === 0 || wb.series[i - 1].label < p.label));
  });
});

describe("audit.mn register", () => {
  it("reads the total and each report row", () => {
    const { total, reports } = parseAuditList(fixture("audit-list.html"), "Сөрөг дүгнэлт");
    assert.equal(total, 138);
    assert.equal(reports.length, 3);
    assert.deepEqual(reports[0], {
      id: "44845",
      title: "ӨМНӨГОВЬ АЙМГИЙН ЗАСАГ ДАРГЫН 2025 ОНЫ САНХҮҮГИЙН НЭГТГЭСЭН ТАЙЛАНД ХИЙСЭН АУДИТЫН ТАЙЛАН",
      office: "Өмнөговь аймаг дахь Төрийн аудитын газар",
      auditType: "Санхүүгийн тайлангийн аудит",
      opinion: "Сөрөг дүгнэлт",
      url: "https://audit.mn/audit/report_detail/44845",
    });
  });

  it("returns no total for a page without results", () => {
    assert.deepEqual(parseAuditList("<html><body></body></html>", "Сөрөг дүгнэлт"), { total: null, reports: [] });
  });
});

describe("governments by year", () => {
  it("lists every Prime Minister in office during a year, acting ones left out", () => {
    assert.deepEqual(
      governmentsInYear(2014).map((g) => g.pm),
      ["Н.Алтанхуяг", "Ч.Сайханбилэг"],
    );
    assert.deepEqual(
      governmentsInYear(2026).map((g) => g.pm),
      ["Г.Занданшатар", "Н.Учрал"],
    );
    assert.deepEqual(
      governmentsInYear(2019).map((g) => g.pm),
      ["У.Хүрэлсүх"],
    );
  });

  it("has no overlapping terms and only one open term", () => {
    for (let i = 1; i < GOVERNMENTS.length; i++) assert.ok(GOVERNMENTS[i - 1].to! <= GOVERNMENTS[i].from, GOVERNMENTS[i].pm);
    assert.equal(GOVERNMENTS.filter((g) => g.to === null).length, 1);
  });
});
