import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import type { JsonStat2 } from "@/lib/budget/jsonstat";
import { agoPoints, AIMAG_CODES, GOODS, monthKey, monthLabel, monthsAgo, parsePrices, parseWages, perWage, quarterKey, quarterLabel, UB_CODE, wagePairs, yearlyPct, yearlySeries } from "@/lib/budget/prices";
import { isOfficialSource, TARIFFS, TARIFFS_VERIFIED_THROUGH, verifiedTariffs } from "@/lib/budget/tariffs";

const stat = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/budget/${name}`, import.meta.url), "utf8")) as JsonStat2;

// The fixture holds 3 of the 13 goods (beef, petrol, canteen) × UB + 5 aimags × every month since 2010-12.
const FIXTURE_GOODS = GOODS.filter((g) => ["beef", "petrol", "canteen"].includes(g.key));
const prices = parsePrices(stat("nso-prices.json"), FIXTURE_GOODS);
const wages = parseWages(stat("nso-wages.json"));
const beef = prices.goods.find((g) => g.key === "beef")!;

describe("NSO prices", () => {
  it("keys months by label, oldest first, and reads Ulaanbaatar's series", () => {
    assert.equal(prices.months[0], "2010-12");
    assert.equal(prices.latestMonth, "2026-09");
    assert.equal(prices.months.length, 190);
    assert.equal(beef.ub.at(-1), 31210);
    assert.equal(beef.ub[0], 4060);
    assert.equal(prices.goods.map((g) => g.key).join(","), "beef,petrol,canteen");
    assert.equal(prices.updated, "2026-10-08T00:00:00Z");
  });

  it("keeps each aimag's latest month next to the capital, in NSO's order", () => {
    assert.deepEqual(
      prices.regions.map((r) => r.code),
      [UB_CODE, "183", "261", "345", "346", "423"],
    );
    assert.equal(prices.regions[1].name, "Баян-Өлгий");
    assert.equal(beef.regions[UB_CODE], 31210);
    assert.equal(beef.regions["183"], 22839);
    for (const r of prices.regions) assert.ok(typeof beef.regions[r.code] === "number", r.name);
    assert.equal(AIMAG_CODES.length, 21);
    assert.equal(new Set(AIMAG_CODES).size, 21);
  });

  it("finds the same month 1, 5, 10 and 15 years back with the nominal change", () => {
    const pts = agoPoints(prices.months, beef.ub, prices.latestMonth);
    assert.deepEqual(
      pts.map((p) => [p.years, p.month, p.value]),
      [
        [1, "2025-09", 20755],
        [5, "2021-09", 13420],
        [10, "2016-09", 6662],
        [15, "2011-09", 4760],
      ],
    );
    assert.equal(Math.round(pts[0].pct!), 50);
    assert.equal(monthsAgo("2026-09", 15), "2011-09");
    assert.equal(Math.round(yearlyPct(prices.months, beef.ub)!), 50);
  });

  it("gives one September per year plus the latest month when it is not a September", () => {
    const yearly = yearlySeries(prices.months, beef.ub);
    assert.equal(yearly[0].label, "2011");
    assert.equal(yearly.at(-1)!.label, "2026");
    assert.equal(yearly.length, 16);
    const shifted = yearlySeries(["2025-09", "2025-10"], [1, 2]);
    assert.deepEqual(shifted, [
      { label: "2025", value: 1 },
      { label: "2025-10", value: 2 },
    ]);
  });

  it("refuses a release with too few goods, so the old snapshot stays", () => {
    assert.throws(() => parsePrices(stat("nso-prices.json"), GOODS), /only 3 goods/);
  });

  it("reads month and quarter labels in the shapes NSO prints", () => {
    assert.equal(monthKey("2026-9"), "2026-09");
    assert.equal(monthKey("2026 09"), "2026-09");
    assert.equal(monthKey("2026-13"), null);
    assert.equal(monthKey("Бүгд"), null);
    assert.equal(quarterKey("2026-2"), "2026-2");
    assert.equal(quarterKey("2026-II"), "2026-2");
    assert.equal(quarterKey("2026 оны 4-р улирал"), "2026-4");
    assert.equal(quarterKey("2026"), null);
    assert.equal(monthLabel("2026-09"), "2026 оны 9-р сар");
    assert.equal(quarterLabel("2026-2"), "2026 оны II улирал");
  });
});

describe("NSO wages", () => {
  it("scales thousand ₮ to ₮ and orders quarters", () => {
    assert.equal(wages.quarters[0], "2000-4");
    assert.equal(wages.quarters.at(-1), "2026-2");
    assert.equal(wages.national.at(-1), 3_026_600);
    assert.ok(wages.ub.at(-1)! > wages.national.at(-1)!);
  });

  it("pairs the price month with the newest wage quarter and the quarters 5 and 10 years earlier", () => {
    const pairs = wagePairs(wages, "2026-09");
    assert.deepEqual(
      pairs.map((p) => p.quarter),
      ["2016-2", "2021-2", "2026-2"],
    );
    assert.equal(perWage(3_026_600, 31210), 96);
    assert.equal(perWage(null, 31210), null);
    assert.equal(perWage(1000, 0), null);
  });
});

describe("tariffs", () => {
  it("renders only rows a person verified, newest first, with https sources", () => {
    const rows = verifiedTariffs();
    assert.ok(rows.length >= 2);
    assert.ok(rows.every((r) => r.verified <= TARIFFS_VERIFIED_THROUGH && /^\d{4}-\d{2}-\d{2}$/.test(r.from) && r.values.length > 0));
    assert.ok(rows.every((r, i) => i === 0 || rows[i - 1].from >= r.from));
    assert.ok(!rows.some((r) => r.from === "2026-06-05"));
    assert.ok(TARIFFS.some((r) => r.verified === null));
  });
  it("tells a regulator's page from a news site", () => {
    assert.ok(isOfficialSource("https://erc.gov.mn/mn/news/921"));
    assert.ok(!isOfficialSource("https://eguur.mn/445108/"));
    assert.ok(!isOfficialSource("not a url"));
  });
});
