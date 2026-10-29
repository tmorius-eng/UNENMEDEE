import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ABOUT_FIELDS, cleanAboutText, DEFAULT_ABOUT, paragraphs, parseAbout } from "@/lib/about";

describe("/about text", () => {
  it("falls back to the default for every missing, empty or malformed field", () => {
    assert.deepEqual(parseAbout(null), DEFAULT_ABOUT);
    assert.deepEqual(parseAbout("not json"), DEFAULT_ABOUT);
    const a = parseAbout(JSON.stringify({ who: "Б.Бат ажиллуулдаг.", funding: "   ", lead: 42 }));
    assert.equal(a.who, "Б.Бат ажиллуулдаг.");
    assert.equal(a.funding, DEFAULT_ABOUT.funding, "blank keeps the default");
    assert.equal(a.lead, "42", "a number is read as text");
  });

  it("stores plain text only: no control characters, at most two newlines, capped length", () => {
    assert.equal(cleanAboutText("а\r\nб\u0000\u0007в\n\n\n\nг", 100), "а\nбв\n\nг");
    assert.equal(cleanAboutText("x".repeat(50), 10), "x".repeat(10));
    assert.equal(cleanAboutText("<script>alert(1)</script>", 100), "<script>alert(1)</script>", "kept as text; React escapes it on the page");
  });

  it("splits paragraphs on blank lines and keeps single line breaks inside one", () => {
    assert.deepEqual(paragraphs("нэг\nхоёр\n\nгурав\n \n"), ["нэг\nхоёр", "гурав"]);
  });

  it("every field has a default within its limit, and the defaults never accuse anyone", () => {
    for (const f of ABOUT_FIELDS) {
      assert.ok(DEFAULT_ABOUT[f.key].length > 40 && DEFAULT_ABOUT[f.key].length <= f.max, f.key);
      assert.doesNotMatch(DEFAULT_ABOUT[f.key], /авлигач|хулгай|луйвар/i, f.key);
    }
  });
});
