import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { legalinfoDetailText, parseLegalinfoList } from "@/lib/scraper/adapters/legalinfo";
import { parsePoliceArticle, parsePoliceList } from "@/lib/scraper/adapters/police";
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

describe("police.gov.mn news", () => {
  it("reads article cards with the upload day from the image path", () => {
    const items = parsePoliceList(fixture("police-list.html"));
    assert.equal(items.length, 4); // the /a/890 menu link is not a card
    assert.deepEqual(items[0], {
      url: "https://police.gov.mn/a/8369",
      title: "Хиймэл оюунд суурилсан залилангаас урьдчилан сэргийлэх нөлөөллийн аян эхэллээ",
      day: new Date("2026-10-21T00:00:00+08:00"),
    });
  });

  it("takes the text and the exact Ulaanbaatar time from the article page", () => {
    const a = parsePoliceArticle(fixture("police-article.html"));
    assert.equal(a.title, "Хиймэл оюунд суурилсан залилангаас урьдчилан сэргийлэх нөлөөллийн аян эхэллээ");
    assert.equal(a.publishedAt?.toISOString(), "2026-10-21T04:19:00.000Z");
    assert.ok(a.text.startsWith("Олон улсын эрүүгийн цагдаагийн байгууллага-Интерпол"));
    assert.ok(a.text.length > 500);
  });

  it("returns empty text for image-only posts (skipped by the runner)", () => {
    const a = parsePoliceArticle('<div class="article-view-main"><article><h2 class="article-view-name">Хоногийн мэдээ</h2><img src="x.jpg"></article></div>');
    assert.equal(a.text, "");
    assert.equal(a.publishedAt, null);
  });
});
