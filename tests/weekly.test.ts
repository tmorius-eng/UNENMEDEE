import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { biggestAmount, isoWeek, isWeeklyDue, mostNamed, previousWeek, weeklyShortText, weeklyText, type WeeklyTop } from "@/lib/social/weekly";

describe("weekly top list", () => {
  it("is due on Monday in Ulaanbaatar and covers the Monday–Sunday before", () => {
    // Sunday 2026-10-25 17:00 UTC is Monday 01:00 in Ulaanbaatar.
    assert.ok(isWeeklyDue(new Date("2026-10-25T17:00:00Z")));
    assert.ok(!isWeeklyDue(new Date("2026-10-25T15:00:00Z")));
    const w = previousWeek(new Date("2026-10-26T02:00:00Z"));
    assert.equal(w.label, "10-р сарын 19–25");
    assert.equal(w.from.toISOString(), "2026-10-18T16:00:00.000Z");
    assert.equal(w.to.toISOString(), "2026-10-25T16:00:00.000Z");
    assert.equal(w.week, isoWeek(new Date(Date.UTC(2026, 9, 19))));
    assert.equal(previousWeek(new Date("2026-11-02T02:00:00Z")).label, "10-р сарын 26 – 11-р сарын 1");
  });

  it("ISO weeks roll over the year correctly", () => {
    assert.equal(isoWeek(new Date(Date.UTC(2026, 0, 1))), 202601);
    assert.equal(isoWeek(new Date(Date.UTC(2027, 0, 1))), 202653);
  });

  it("picks the story naming the largest ₮ amount", () => {
    const b = biggestAmount([
      { title: "A", amounts: ["5 сая ₮"] },
      { title: "B", amounts: ["1.2 их наяд ₮", "3 тэрбум ₮"] },
      { title: "C", amounts: [] },
    ]);
    assert.equal(b?.title, "B");
    assert.equal(b?.amount, "1.2 их наяд ₮");
  });

  it("counts MPs by exact short name, once per story, never a shared name, at least two stories", () => {
    const mps = [
      { id: 1, shortName: "Х.Баттулга" },
      { id: 2, shortName: "Д.Цогтбаатар" },
      { id: 3, shortName: "Д.Цогтбаатар" },
    ];
    const shared = new Set(["Д.Цогтбаатар"]);
    const people = [["Х.Баттулга", "Х.Баттулга"], ["Х.Баттулга", "Д.Цогтбаатар"], ["Д.Цогтбаатар"], ["Д.Цогтбаатар"]];
    assert.deepEqual(mostNamed(people, mps, shared), { name: "Х.Баттулга", politicianId: 1, stories: 2 });
    assert.equal(mostNamed([["Х.Баттулга"]], mps, shared), undefined);
  });

  it("writes one list: bold and <links> on Discord, plain elsewhere, short on Threads", () => {
    const w: WeeklyTop = {
      week: 202643,
      label: "10-р сарын 19–25",
      biggest: { title: "Төсвийн тодотгол", slug: "tusuv", amount: "3 их наяд ₮", amounts: ["3 их наяд ₮"] },
      hottest: { title: "Цас орно", clusterId: 7, sources: 5 },
      mostNamed: { name: "Х.Баттулга", politicianId: 1, stories: 4 },
      legalActs: 26,
      articles: 717,
      sources: 54,
      risky: 3,
    };
    const d = weeklyText(w, "discord");
    assert.ok(d.startsWith("📊 **7 хоногийн ТОП** · 10-р сарын 19–25"));
    assert.ok(d.includes("💸 **Хамгийн том дүн**: 3 их наяд ₮ (3.43 сая хүнд хуваавал ≈ 875 900₮ / хүн)"));
    assert.ok(d.includes("> Төсвийн тодотгол <https://iltodmedee.mn/article/tusuv>"));
    assert.ok(d.includes("Х.Баттулга · 4 мэдээ (тоо, үнэлгээ биш)"));
    assert.ok(d.includes("📰 717 мэдээ · 54 эх сурвалж · ⚠️ 3 өндөр эрсдэлтэй (AI-ийн үнэлгээ)"));
    const plain = weeklyText(w, "plain");
    assert.ok(!plain.includes("**") && !plain.includes("<https"));
    assert.ok(new TextEncoder().encode(weeklyShortText(w)).length <= 500);
  });
});
