import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { opendataItemToScraped, parseOpendataResponse } from "@/lib/scraper/adapters/opendata";
import { parliamentArticleToScraped, parseParliamentPage } from "@/lib/scraper/adapters/parliament";
import { classifyDomain, harvestGovernmentHosts, isGovernmentHost, siteName } from "@/lib/scraper/discover";
import { findFeedUrl, harvestArticleLinks, isWordPress, parseFeed, sameSite, scoreLink } from "@/lib/scraper/links";

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8");

describe("harvestArticleLinks", () => {
  it("finds article links on the real mlsp.gov.mn listing page", () => {
    const links = harvestArticleLinks(fixture("mlsp-listing.html"), "https://mlsp.gov.mn/content?c=1", "mlsp.gov.mn");
    assert.ok(links.length >= 5, `found ${links.length}`);
    assert.ok(links.every((l) => l.url.startsWith("https://mlsp.gov.mn/")));
    assert.ok(links.slice(0, 5).every((l) => /\/content\/detail\/\d+/.test(l.url)), JSON.stringify(links.slice(0, 5)));
  });

  it("ignores menus, files, categories and off-site links", () => {
    const html = `<html><body>
      <nav><a href="/news/123">Цэс дэх мэдээ гарчиг урт</a></nav>
      <ul class="sub-menu"><a href="/about-us/structure-of-ministry">Бүтэц зохион байгуулалт</a></ul>
      <div class="has-menu-wrapper"><main>
        <a href="/news/7642">Эрүүл мэндийн салбарын хүний нөөцийг хөгжүүлэх нь чухал</a>
        <a href="/14533.html">Төрийн өмчит үйлдвэрийн газруудыг цомхотголоо</a>
        <a href="/files/report.pdf">Тайлан татах</a>
        <a href="/c/news/onclokh">онцлох мэдээ</a>
        <a href="https://facebook.com/news/1">Facebook</a>
      </main></div></body></html>`;
    const urls = harvestArticleLinks(html, "https://moh.gov.mn/home", "moh.gov.mn").map((l) => l.url);
    assert.deepEqual(urls.sort(), ["https://moh.gov.mn/14533.html", "https://moh.gov.mn/news/7642"]);
  });

  it("scores WordPress permalinks and long Cyrillic headlines highly", () => {
    const u = new URL("https://www.mimr.gov.mn/2026/10/19/slug/");
    assert.ok(scoreLink(u, "Салбарын эрх зүйн шинэчлэлийг эрчимжүүлэх үүрэг өглөө") >= 7);
    assert.equal(scoreLink(new URL("https://x.gov.mn/wp-content/uploads/a.jpg"), "x"), 0);
  });

  it("treats www and subdomains as the same site", () => {
    assert.ok(sameSite("www.mimr.gov.mn", "mimr.gov.mn"));
    assert.ok(sameSite("www.gov.mn", "gov.mn"));
    assert.ok(!sameSite("mof.gov.mn", "moh.gov.mn"));
  });
});

describe("feeds and WordPress detection", () => {
  it("detects WordPress and feed links", () => {
    const html = `<link rel="alternate" type="application/rss+xml" href="/feed/"><link rel="alternate" type="application/rss+xml" href="/comments/feed/"><script src="/wp-includes/js/x.js"></script>`;
    assert.ok(isWordPress(html));
    assert.equal(findFeedUrl(html, "https://cabinet.gov.mn/"), "https://cabinet.gov.mn/feed/");
  });

  it("parses RSS and Atom", () => {
    const rss = `<rss><channel><item><title>Мэдээ</title><link>https://a.gov.mn/n/1</link><pubDate>Mon, 19 Oct 2026 08:00:00 +0800</pubDate></item></channel></rss>`;
    const atom = `<feed><entry><title>B</title><link href="https://a.gov.mn/n/2"/><published>2026-10-18T00:00:00Z</published></entry></feed>`;
    assert.deepEqual(parseFeed(rss).map((i) => i.url), ["https://a.gov.mn/n/1"]);
    assert.equal(parseFeed(rss)[0].publishedAt?.toISOString(), "2026-10-19T00:00:00.000Z");
    assert.deepEqual(parseFeed(atom).map((i) => i.url), ["https://a.gov.mn/n/2"]);
  });
});

describe("JSON API adapters (real responses)", () => {
  it("maps opendata.gov.mn datasets to articles", () => {
    const items = parseOpendataResponse(JSON.parse(fixture("opendata-search.json")));
    assert.equal(items.length, 3);
    const a = opendataItemToScraped(items[0]);
    assert.match(a.url, /^https:\/\/opendata\.gov\.mn\/dataview\/\d+$/);
    assert.match(a.text, /Эзэмшигч байгууллага: /);
    assert.ok(a.meta?.dataset_org);
    assert.ok(a.publishedAt instanceof Date);
  });

  it("maps parliament.mn API articles with full text", () => {
    const items = parseParliamentPage(JSON.parse(fixture("parliament-articles.json")));
    assert.ok(items.length >= 1);
    const a = parliamentArticleToScraped(items[0]);
    assert.ok(a);
    assert.match(a.url, /^https:\/\/parliament\.mn\/parliament-news\/detail\//);
    assert.ok(a.text.length > 200);
    assert.ok(!/<p|&nbsp;/.test(a.text), "HTML stripped");
  });
});

describe("source discovery", () => {
  it("harvests government hosts and drops infrastructure subdomains", () => {
    const html = `<a href="https://www.mof.gov.mn/">Сангийн яам</a>
      <a href="https://photo.burtgel.gov.mn/x">photo</a>
      <a href="https://cdn.gov.mn/a.js">cdn</a>
      <a href="https://sant.selenge.khural.mn/">Сант сум</a>
      <a href="https://example.com/">other</a>
      footer: https://arkhangai.gov.mn`;
    assert.deepEqual(harvestGovernmentHosts(html, "https://www.gov.mn/").sort(), [
      "arkhangai.gov.mn",
      "mof.gov.mn",
      "sant.selenge.khural.mn",
    ]);
    assert.ok(isGovernmentHost("www.gov.mn"));
    assert.ok(!isGovernmentHost("news.mn"));
  });

  it("classifies local governments and reads site names", () => {
    assert.equal(classifyDomain("selenge.gov.mn"), "local");
    assert.equal(classifyDomain("nad.ub.gov.mn"), "local");
    assert.equal(classifyDomain("sant.selenge.khural.mn"), "local");
    assert.equal(classifyDomain("masm.gov.mn"), "agency");
    assert.equal(siteName("<title>Нүүр хуудас | ТТХГ</title>", "x"), "ТТХГ");
    assert.equal(siteName("<title>Index of /</title>", "dundgovi.gov.mn"), "dundgovi.gov.mn");
  });
});
