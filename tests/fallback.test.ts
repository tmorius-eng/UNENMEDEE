import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { extractiveSummary } from "@/lib/ai/fallback";

describe("summary fallback (no AI)", () => {
  it("takes the first sentences, one per line", () => {
    const text = "Засгийн газрын ээлжит хуралдаан өнөөдөр болов. Хуралдаанаар 12 асуудал хэлэлцэв. Гурав дахь өгүүлбэр энд байна.";
    assert.equal(extractiveSummary(text), "Засгийн газрын ээлжит хуралдаан өнөөдөр болов.\nХуралдаанаар 12 асуудал хэлэлцэв.");
  });

  it("cuts a very long first sentence at a word boundary", () => {
    const long = `${"маш урт өгүүлбэр ".repeat(40)}төгсгөл.`;
    const s = extractiveSummary(long, 2, 120);
    assert.ok(s.length <= 120 && s.endsWith("…"), s);
    assert.ok(!/\s…$/.test(s));
  });

  it("returns empty text for empty input", () => {
    assert.equal(extractiveSummary("   "), "");
  });
});
