import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { compareTexts, decide, splitSentences } from "@/lib/scraper/recheck";

const STORED = [
  "Засгийн газрын хуралдаанаар орон нутгийн авто замын санд 761,1 сая төгрөг төвлөрүүлэхээр шийдвэрлэлээ.",
  "Энэ хөрөнгөөр аймгуудын төвийг холбосон 12 замыг засварлана.",
  "Ажлыг 2026 оны 11 дүгээр сарын 30-ны дотор дуусгахыг сайд үүрэг болголоо.",
  "Тендерийн урилгыг ирэх долоо хоногт нийтэлнэ гэж яамнаас мэдээллээ.",
].join("\n");

const prev = { status: null, missingCount: 0, checkedAt: null };

describe("source recheck", () => {
  it("drops dates, counters and short lines from sentences", () => {
    assert.deepEqual(splitSentences("2026-10-21 10:30\n1,204 уншсан\nНүүр\n" + STORED).length, 4);
  });

  it("is ok when the page only added widgets around our text", () => {
    const fresh = `Холбоотой мэдээ: Өөр нэг мэдээний гарчиг энд байна.\n${STORED}\n3,512 уншсан\nСүүлийн мэдээнүүд: Бусад гарчиг байрлана.`;
    const d = decide(prev, STORED, { kind: "text", text: fresh });
    assert.equal(d.status, "ok");
  });

  it("flags a changed number with a before/after pair", () => {
    const fresh = STORED.replace("761,1 сая", "561,1 сая");
    const c = compareTexts(STORED, fresh);
    assert.equal(c.numbersChanged, true);
    assert.equal(c.pairs.length, 1);
    const d = decide(prev, STORED, { kind: "text", text: fresh });
    assert.equal(d.status, "changed");
    assert.match(d.diff!.pairs[0].after, /561,1/);
  });

  it("flags removed paragraphs", () => {
    const fresh = STORED.split("\n").slice(0, 2).join("\n") + "\nШинэ өгүүлбэр нэмэгдсэн бөгөөд энэ нь урт байна.";
    const d = decide(prev, STORED, { kind: "text", text: fresh });
    assert.equal(d.status, "changed");
    assert.equal(d.diff!.removed.length + d.diff!.pairs.length, 2);
  });

  it("skips failed extraction and fetch errors", () => {
    assert.equal(decide(prev, STORED, { kind: "text", text: "Нүүр хуудас" }).status, null);
    assert.equal(decide(prev, STORED, { kind: "error" }).status, null);
  });

  it("calls a page gone only after two misses days apart", () => {
    const now = new Date("2026-10-24T00:00:00Z");
    const first = decide(prev, STORED, { kind: "missing" }, now);
    assert.deepEqual(first, { status: null, missingCount: 1 });
    const sameDay = decide({ status: null, missingCount: 1, checkedAt: now }, STORED, { kind: "missing" }, new Date("2026-10-24T05:00:00Z"));
    assert.deepEqual(sameDay, { status: null, missingCount: 1 });
    const week = decide({ status: null, missingCount: 1, checkedAt: now }, STORED, { kind: "missing" }, new Date("2026-10-31T00:00:00Z"));
    assert.deepEqual(week, { status: "gone", missingCount: 2 });
  });
});
