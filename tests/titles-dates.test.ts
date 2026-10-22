import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { looksOld, newestYearMentioned } from "@/lib/scraper/dates";
import { dateFromText, extractArticle } from "@/lib/scraper/extractor";
import { chooseTitle, firstSentenceTitle, isGenericTitle, looksLikeNavigation } from "@/lib/scraper/titles";

const page = (name: string) => readFileSync(new URL(`./fixtures/dates/${name}.html`, import.meta.url), "utf8");

describe("generic titles", () => {
  it("spots site and section titles", () => {
    assert.ok(isGenericTitle("Мэдээ | ТТХГ"));
    assert.ok(isGenericTitle("Нүүр хуудас"));
    assert.ok(isGenericTitle("Мэдээ мэдээлэл - Home"));
    assert.ok(isGenericTitle("Татварын ерөнхий газар", ["Татварын ерөнхий газар"]));
    assert.ok(isGenericTitle("Эрүүл Мэндийн даатгал | Эрүүл Мэндийн даатгал", ["Эрүүл мэндийн даатгалын ерөнхий газар", "Эрүүл Мэндийн даатгал"]));
    assert.ok(isGenericTitle("Журам"));
  });

  it("keeps real headlines, including ones that start with the agency's name", () => {
    assert.ok(!isGenericTitle("Татварын ерөнхий газар шинэ журам баталлаа", ["Татварын ерөнхий газар"]));
    assert.ok(!isGenericTitle("ДУУДЛАГА ХУДАЛДААНД УРЬЖ БАЙНА"));
    assert.ok(!isGenericTitle("Азийн хөгжлийн банктай хамтран ажиллах талаар хэлэлцлээ | ЭМДЕГ"));
  });

  it("falls back to the first real sentence, skipping date lines", () => {
    assert.equal(
      firstSentenceTitle("2026 оны 10 -р сарын 21, Лхагва\nТус газрын алба хаагчид сургалтад хамрагдлаа. Дараагийн өгүүлбэр."),
      "Тус газрын алба хаагчид сургалтад хамрагдлаа",
    );
    const long = firstSentenceTitle(`${"Монгол Улсын Засгийн газрын ээлжит хуралдаанаар олон чухал асуудлыг хэлэлцэн шийдвэрлэж, тогтоол гаргалаа ".repeat(2)}.`);
    assert.ok(long.length <= 111 && long.endsWith("…"));
  });

  it("chooses the first candidate that is a real headline", () => {
    assert.equal(chooseTitle(["Мэдээ | ТТХГ", null, "Төрийн тусгай хамгаалалтын тухай хуулийн танилцуулга"], "текст"), "Төрийн тусгай хамгаалалтын тухай хуулийн танилцуулга");
  });

  it("recognises menu text glued together by the extractor", () => {
    assert.ok(looksLikeNavigation("ХолбоосуудТөрийн байгууллагаСалбаруудын сайтГадаад улсын байгууллагууд"));
    assert.ok(looksLikeNavigation("Саналаа бичнэ үүНүүр>Татварын тооцоолуур>->Татварын тооцоолуур"));
    assert.ok(!looksLikeNavigation("Өнөөдөр Эрүүл мэндийн даатгалын ерөнхий газрын дарга Ц.Батбаатар Азийн хөгжлийн банкны төлөөлөгчдийг хүлээн авлаа."));
  });
});

describe("dates", () => {
  it("reads dates with an Ulaanbaatar time", () => {
    assert.equal(dateFromText("2026-08-27 15:48:12")?.toISOString(), "2026-08-27T07:48:00.000Z");
    assert.equal(dateFromText("2026 оны 05 дугаар сарын 05")?.toISOString().slice(0, 10), "2026-05-05");
  });

  it("flags undated pages that only mention old years", () => {
    const now = new Date("2026-10-22T00:00:00Z");
    assert.equal(newestYearMentioned("2020 оны хаврын чуулган, 2021 онд"), 2021);
    assert.ok(looksOld("Улсын Их Хурлын 2020 оны хаврын ээлжит чуулганаар", now));
    assert.ok(!looksOld("2025 онд эхэлсэн төсөл", now));
    assert.ok(!looksOld("Он дурдаагүй мэдээ", now));
  });
});

describe("extractor on real pages", () => {
  it("finds the date printed next to the headline", () => {
    const moh = extractArticle(page("moh"), "https://moh.gov.mn/news/7561");
    assert.equal(moh?.publishedAt?.toISOString(), "2026-05-26T18:36:00.000Z");
    const mrpam = extractArticle(page("mrpam"), "https://mrpam.gov.mn/news/x");
    assert.equal(mrpam?.publishedAt?.toISOString(), "2026-08-27T07:48:00.000Z");
    // No <h1>: the headline sits in <h5 class="blog-post-title"> and the date in .blog-post-date.
    const mlsp = extractArticle(page("mlsp"), "https://mlsp.gov.mn/content/detail/4178");
    assert.equal(mlsp?.publishedAt?.toISOString().slice(0, 10), "2026-10-01");
  });

  it("ignores dates in 'related news' lists below the article", () => {
    const emd = extractArticle(page("emd"), "https://emd.gov.mn/news/737");
    assert.equal(emd?.publishedAt, null);
    assert.match(emd?.title ?? "", /^Азийн хөгжлийн банктай/);
  });

  it("uses the article heading instead of the site title", () => {
    const sspa = extractArticle(page("sspa"), "https://sspa.gov.mn/mn/read?id=7");
    assert.match(sspa?.title ?? "", /^Төрийн тусгай хамгаалалтын тухай хуульд/);
    assert.equal(sspa?.publishedAt?.toISOString().slice(0, 10), "2020-05-05");
  });
});
