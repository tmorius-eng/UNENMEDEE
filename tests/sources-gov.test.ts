import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { legalinfoDetailText, parseLegalinfoList } from "@/lib/scraper/adapters/legalinfo";
import { parseZasagFeed } from "@/lib/scraper/adapters/zasag";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("zasag.mn feed (mongolia.gov.mn/feed)", () => {
  const items = parseZasagFeed(fixture("zasag-feed.xml"));
  it("parses full articles with +08:00 dates and working links", () => {
    assert.equal(items.length, 3);
    const first = items[0];
    assert.match(first.url, /^https:\/\/mongolia\.gov\.mn\/news\/view\/27868$/);
    assert.match(first.title, /^ЕРӨНХИЙ САЙД Н\.УЧРАЛ: "50 МЯНГАН ЯНДАН/);
    assert.ok(!first.title.includes("&quot;"));
    assert.equal(first.publishedAt?.toISOString(), "2026-10-21T03:51:00.000Z");
    assert.ok(first.text.length > 300 && !/<[a-z]/i.test(first.text));
  });
});

describe("legalinfo.mn new acts", () => {
  it("parses act links, issuers and the group date", () => {
    const acts = parseLegalinfoList((JSON.parse(fixture("legalinfo-list.json")) as { Html: string }).Html);
    assert.ok(acts.length >= 10);
    const a = acts[0];
    assert.equal(a.url, "https://legalinfo.mn/mn/detail?lawId=17909586641162");
    assert.match(a.title, /^ТАРИФ БАТЛАХ ТУХАЙ/);
    assert.equal(a.issuer, "Эрчим хүчний зохицуулах хороо");
    assert.equal(a.addedAt?.toISOString(), "2026-10-20T16:00:00.000Z");
    assert.ok(acts.every((x) => x.url.includes("lawId=")));
  });

  it("takes the act text from .maincontenter, not the hidden login form", () => {
    const text = legalinfoDetailText(fixture("legalinfo-detail.html"));
    assert.match(text, /АГААРЫН БОХИРДЛЫН ТӨЛБӨРИЙН ХУВЬ ХЭМЖЭЭГ ТОГТООХ ТУХАЙ/);
    assert.match(text, /ТОГТООЛ\s+2026 оны/);
    assert.ok(!text.includes("Нэвтрэх нэр"));
    assert.ok(text.length > 800);
  });
});
