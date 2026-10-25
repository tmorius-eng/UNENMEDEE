import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hookWords } from "@/lib/social/hook";

const hot = (t: string) =>
  hookWords(t)
    .filter((w) => w.hot)
    .map((w) => w.word)
    .join(" ");

describe("hook highlight", () => {
  it("marks the first number with its units and the next word", () => {
    assert.equal(hot("Нийслэлд 250 мянган ам.долларын систем суурилуулав"), "250 мянган ам.долларын систем");
    assert.equal(hot("Төмс хураалт 100 хувь дуусаж"), "100 хувь дуусаж");
    assert.equal(hot("ҮАГ 20 аудитын тайланг нийтэллээ"), "20 аудитын");
  });

  it("stops at a clause end and never runs into the next number", () => {
    assert.equal(hot("Хадлан 57, тэжээл 75 хувь"), "57,");
    assert.equal(hot("195.5 мянган өрхийн 61.8 сая мал"), "195.5 мянган өрхийн");
  });

  it("leaves headlines without numbers plain", () => {
    assert.equal(hot("Шинэ хууль батлагдлаа"), "");
    assert.equal(hookWords("Шинэ хууль").length, 2);
  });
});
