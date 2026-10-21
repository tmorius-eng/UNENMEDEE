import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toPrefixQuery } from "@/lib/search";

describe("search query", () => {
  it("builds a prefix query that survives Mongolian suffixes", () => {
    assert.equal(toPrefixQuery("Татварын тендер"), "татва:* & тендер:*");
    assert.equal(toPrefixQuery("УИХ"), "уих:*");
    assert.equal(toPrefixQuery("Оюу толгой 2025"), "оюу:* & толгой:* & 2025:*");
  });

  it("strips operators and injection attempts", () => {
    assert.equal(toPrefixQuery("a & b | !c ) ( ' ; --"), null);
    assert.equal(toPrefixQuery("тест' | drop:*"), "тест:* & drop:*");
    assert.equal(toPrefixQuery("   "), null);
  });

  it("caps the number of terms", () => {
    assert.equal(toPrefixQuery("aa bb cc dd ee ff gg hh")?.split(" & ").length, 6);
  });
});
