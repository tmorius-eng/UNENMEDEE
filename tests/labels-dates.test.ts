import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { governmentsBetween, governmentsInYear, yearUnverified } from "@/lib/budget/governments";
import { latestPopulation } from "@/lib/budget/population";
import { shilendansPeriod } from "@/lib/budget/shilendans";
import { digestWindowsLabel, RULE_BASED_NOTE, ruleBasedNote } from "@/lib/edition";
import { activeBlacklist } from "@/lib/opendata-mn/highlights";
import { digestPayload } from "@/lib/push/core";
import { discordDigestPost } from "@/lib/social/discord";
import { digestPost } from "@/lib/social/facebook";
import { instagramDigestPost } from "@/lib/social/instagram";
import { threadsDigestPost } from "@/lib/social/threads";
import type { DatasetHighlight } from "@/lib/types";

describe("labels and dates stay true", () => {
  it("the open-ended Prime Minister is only named up to the day the list was checked", () => {
    assert.deepEqual(governmentsInYear(2026, "2026-10-21").map((g) => g.pm), ["Г.Занданшатар", "Н.Учрал"]);
    assert.deepEqual(governmentsInYear(2027, "2026-10-21"), [], "nobody has confirmed 2027");
    assert.deepEqual(governmentsInYear(2027, "2027-05-01").map((g) => g.pm), ["Н.Учрал"]);
    assert.ok(yearUnverified(2026, "2026-10-21"));
    assert.ok(!yearUnverified(2025, "2026-10-21"));
    assert.deepEqual(governmentsBetween("2024-08-27", "2028-07-01", "2026-10-21").map((g) => g.pm), ["Л.Оюун-Эрдэнэ", "Г.Занданшатар", "Н.Учрал"]);
    assert.deepEqual(governmentsBetween("2027-01-01", "2028-07-01", "2026-10-21"), []);
  });

  it("rule-based editions say so in every post and in the push", () => {
    const d = { id: 7, kind: "12h", title: "Тойм", intro: "Энэ хугацаанд 40 мэдээнээс эрэмбэлсэн 10 мэдээ.", periodEnd: "2026-10-27T12:00:00Z", items: [{ headline: "Төсөв батлагдлаа", whyItMatters: "Мөнгө." }] };
    const rule = { ...d, generatedBy: "rule-based" };
    const ai = { ...d, generatedBy: "groq/llama" };
    assert.equal(ruleBasedNote(rule), RULE_BASED_NOTE);
    assert.equal(ruleBasedNote(ai), null);
    assert.ok(digestPost(rule).message.includes(RULE_BASED_NOTE));
    assert.ok(!digestPost(ai).message.includes(RULE_BASED_NOTE));
    assert.ok(instagramDigestPost(rule).caption.includes(RULE_BASED_NOTE));
    assert.ok(discordDigestPost(rule).text.includes(RULE_BASED_NOTE));
    assert.match(threadsDigestPost(rule).text, /AI редакторгүй/);
    assert.doesNotMatch(threadsDigestPost(ai).text, /AI редакторгүй/);
    assert.match(digestPayload(rule).body, /^AI редакторгүй/);
    assert.doesNotMatch(digestPayload(ai).body, /редакторгүй/);
  });

  it("an ended ban drops out even when the sync has stopped", () => {
    const h: DatasetHighlight = {
      kind: "blacklist",
      total: 3,
      activeCount: 2,
      items: [
        { name: "А ХХК", registry: "1", reason: "", note: "", start: "2025-01-01", end: "2026-12-31" },
        { name: "Б ХХК", registry: "2", reason: "", note: "", start: "2025-01-01", end: "" },
      ],
    };
    assert.equal(activeBlacklist(h, new Date("2026-10-27T00:00:00Z")).activeCount, 2);
    const later = activeBlacklist(h, new Date("2027-01-02T00:00:00Z"));
    assert.ok(later.kind === "blacklist");
    assert.equal(later.activeCount, 1);
    assert.deepEqual(later.items.map((i) => i.name), ["Б ХХК"], "no end date = still in force");
  });

  it("edition hours come from the real windows", () => {
    assert.equal(digestWindowsLabel(), "өглөө 06–11, орой 17–23 цагийн хооронд");
    assert.equal(digestWindowsLabel([[7, 9]]), "өглөө 07–09 цагийн хооронд");
  });

  it("Шилэн данс shows last year in January and February", () => {
    assert.deepEqual(shilendansPeriod(new Date("2027-01-15T03:00:00Z")), { from: "2026-01-01", to: "2026-12-31" });
    assert.deepEqual(shilendansPeriod(new Date("2027-02-28T15:00:00Z")), { from: "2026-01-01", to: "2026-12-31" }, "23:00 on 28 February in Ulaanbaatar");
    assert.deepEqual(shilendansPeriod(new Date("2027-02-28T17:00:00Z")), { from: "2027-01-01", to: "2027-03-01" }, "01:00 on 1 March in Ulaanbaatar");
    assert.deepEqual(shilendansPeriod(new Date("2026-10-27T03:00:00Z")), { from: "2026-01-01", to: "2026-10-27" });
  });

  it("reads NSO's newest total population", () => {
    const ds = {
      version: "2.0",
      class: "dataset",
      id: ["Хүйс", "Нас", "Он"],
      size: [1, 1, 2],
      dimension: {
        Хүйс: { category: { index: { "0": 0 }, label: { "0": "Нийт дүн" } } },
        Нас: { category: { index: { "0": 0 }, label: { "0": "Нийт дүн" } } },
        Он: { category: { index: { "0": 0, "1": 1 }, label: { "0": "2025", "1": "2024" } } },
      },
      value: [3_425_162, 3_394_000],
    };
    assert.deepEqual(latestPopulation(ds as never), { year: 2025, count: 3_425_162 });
  });
});
