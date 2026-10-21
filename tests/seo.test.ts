import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import robots from "@/app/robots";
import { extractWithCheerio } from "@/lib/scraper/extract-safe";
import { absoluteUrl, jsonLd, SITE_URL, xmlEscape } from "@/lib/site";
import { contentHash } from "@/lib/text";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("site helpers", () => {
  it("builds absolute URLs on one host", () => {
    assert.equal(absoluteUrl("/article/x"), `${SITE_URL}/article/x`);
    assert.equal(absoluteUrl("data"), `${SITE_URL}/data`);
    assert.ok(!SITE_URL.endsWith("/"));
  });

  it("escapes JSON-LD so a title cannot close the script tag", () => {
    const out = jsonLd({ headline: "</script><script>alert(1)</script>" });
    assert.ok(!out.includes("<"));
    assert.deepEqual(JSON.parse(out), { headline: "</script><script>alert(1)</script>" });
  });

  it("escapes XML special characters", () => {
    assert.equal(xmlEscape(`Тендер <A & B> "1" 'x'`), "Тендер &lt;A &amp; B&gt; &quot;1&quot; &apos;x&apos;");
  });
});

describe("robots.txt", () => {
  it("allows everything except /admin and lists both sitemaps", () => {
    const r = robots();
    const rule = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    assert.equal(rule.allow, "/");
    assert.deepEqual(rule.disallow, ["/admin", "/admin/"]);
    assert.deepEqual(r.sitemap, [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/news-sitemap.xml`]);
  });
});

describe("extractWithCheerio (fallback when jsdom cannot load)", () => {
  it("extracts title and paragraphs from a real ministry page", () => {
    const a = extractWithCheerio(fixture("mimr-article.html"));
    assert.ok(a, "article should be extracted");
    assert.ok(a.title.length > 5);
    assert.ok(a.text.length >= 200);
    assert.ok(!/<[a-z]+[\s>]/i.test(a.text), "no HTML left in text");
    assert.equal(a.hash, contentHash(a.text));
  });

  it("drops scripts and navigation and rejects pages with too little text", () => {
    const html = `<html><head><title>Гарчиг</title><script>var x = "secret";</script></head><body><nav><li>Нүүр</li></nav><main><p>Богино.</p></main></body></html>`;
    assert.equal(extractWithCheerio(html), null);
    const long = "Засгийн газрын хуралдаанаар төсвийн тодотголыг хэлэлцлээ. ".repeat(8);
    const ok = extractWithCheerio(html.replace("<p>Богино.</p>", `<h1>Шийдвэр</h1><p>${long}</p>`));
    assert.ok(ok);
    assert.equal(ok.title, "Шийдвэр");
    assert.ok(!ok.text.includes("secret") && !ok.text.includes("Нүүр"));
  });
});
