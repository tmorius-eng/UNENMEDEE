import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { looksOld, newestYearMentioned } from "@/lib/scraper/dates";
import { JSDOM } from "jsdom";

import { dateFromText, extractArticle, extractPublishedDate, parseDateValue } from "@/lib/scraper/extractor";
import { chooseTitle, firstSentenceTitle, isGenericTitle, looksLikeNavigation, unshoutTitle } from "@/lib/scraper/titles";

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
    assert.equal(firstSentenceTitle("Тоон гарын үсгийг олгож эхэллээ 2022-05-111847 уншсанЗасгийн газрын"), "Тоон гарын үсгийг олгож эхэллээ");
    const long = firstSentenceTitle(`${"Монгол Улсын Засгийн газрын ээлжит хуралдаанаар олон чухал асуудлыг хэлэлцэн шийдвэрлэж, тогтоол гаргалаа ".repeat(2)}.`);
    assert.ok(long.length <= 111 && long.endsWith("…"));
  });

  it("chooses the first candidate that is a real headline", () => {
    assert.equal(chooseTitle(["Мэдээ | ТТХГ", null, "Төрийн тусгай хамгаалалтын тухай хуулийн танилцуулга"], "текст"), "Төрийн тусгай хамгаалалтын тухай хуулийн танилцуулга");
  });

  it("recognises menu text glued together by the extractor", () => {
    assert.ok(looksLikeNavigation("ХолбоосуудТөрийн байгууллагаСалбаруудын сайтГадаад улсын байгууллагууд"));
    assert.ok(looksLikeNavigation("Саналаа бичнэ үүНүүр>Татварын тооцоолуур>->Татварын тооцоолуур"));
    assert.ok(looksLikeNavigation("Бидний тухай Мэндчилгээ Танилцуулга Захиргаа удирдлагын газар Аюулгүй байдал"));
    assert.ok(looksLikeNavigation("Нэвтрэх"));
    assert.ok(looksLikeNavigation("Шүгэл ажиллагаа 2023-06-08 1932 уншсан Тоон гарын үсэг 2022-05-11 1847 уншсан"));
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
    assert.ok(looksOld("Улсын Их Хурлын 2020 оны 05 дугаар сарын 14-ний өдрийн чуулганаар", now));
    // A current story that mentions an old year in passing is not an archive post.
    assert.ok(!looksOld("Холбооны Канцлер Фридрих Мерц бараалхлаа. Хоёр улс 2011 онд түншлэлийн харилцаа тогтоосон.", now));
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
    // The only date on the page is the 2020 one printed in the text: years old, so not trusted as
    // the publication date (the story is stored as undated and, being old, unpublished).
    assert.equal(sspa?.publishedAt, null);
  });
});

describe("shouting headlines", () => {
  it("lowers capitals to sentence case", () => {
    assert.equal(unshoutTitle("“1072 ХУВЬЦАА” НЭЭЛТТЭЙ ӨДӨРЛӨГ ЗОХИОН БАЙГУУЛАГДАЖ БАЙНА"), "“1072 хувьцаа” нээлттэй өдөрлөг зохион байгуулагдаж байна");
  });
  it("keeps abbreviations, initials and proper nouns", () => {
    assert.equal(unshoutTitle("УИХ-ЫН ГИШҮҮН Х.БАТТУЛГА МОНГОЛЫН ТӨМӨР ЗАМЫН ТАЛААР МЭДЭГДЭЛ ХИЙЛЭЭ"), "УИХ-ын гишүүн Х.Баттулга Монголын төмөр замын талаар мэдэгдэл хийлээ");
    assert.equal(unshoutTitle("ОЮУ ТОЛГОЙ ТӨСЛИЙН ТАЛААР НӨАТ-ЫН БУЦААЛТ 2026 ОНД"), "Оюу Толгой төслийн талаар НӨАТ-ын буцаалт 2026 онд");
  });
  it("keeps abbreviations before a hyphenated case ending and names after initials", () => {
    assert.equal(unshoutTitle("ШТС-УУДЫН ЭЭЛЖ ХҮЛЭЭЛЦЭХ ЦАГИЙГ 11:00 ЦАГ БОЛГОН ӨӨРЧИЛЛӨӨ"), "ШТС-уудын ээлж хүлээлцэх цагийг 11:00 цаг болгон өөрчиллөө");
    assert.equal(unshoutTitle("АҮЭБЯ-НЫ ДАРГА Б.ДАШПҮРЭВ С.К.ШОЙГУ-ТАЙ УУЛЗЛАА"), "АҮЭБЯ-ны дарга Б.Дашпүрэв С.К.Шойгу-тай уулзлаа");
    assert.equal(unshoutTitle("УЛААН БУРХАН ӨВЧИН ЭРГЭН ТАРХАЖ БАЙНА. БИД ЧАДАХ УУ?"), "Улаан бурхан өвчин эргэн тархаж байна. Бид чадах уу?");
  });
  it("leaves normal and short titles alone", () => {
    assert.equal(unshoutTitle("АНУ: Крипто хөрөнгө холигч үйлчилгээнд тавих хяналт"), "АНУ: Крипто хөрөнгө холигч үйлчилгээнд тавих хяналт");
    assert.equal(unshoutTitle("ХУРАЛ БОЛНО"), "ХУРАЛ БОЛНО");
  });
});

describe("date parsing fixes", () => {
  const doc = (html: string) => new JSDOM(html).window.document;
  const year = new Date().getUTCFullYear();

  it("reads '11-р сар' as November, not January", () => {
    const y = year - 1; // last year: November and December of this year may still be in the future
    assert.equal(dateFromText(`${y} оны 11-р сар 5`)?.toISOString().slice(0, 10), `${y}-11-05`);
    assert.equal(dateFromText(`${y} 12-р сар 1`)?.toISOString().slice(0, 10), `${y}-12-01`);
    assert.equal(dateFromText(`${y} 1-р сар 9`)?.toISOString().slice(0, 10), `${y}-01-09`);
  });

  it("treats machine dates without a zone as Ulaanbaatar time", () => {
    assert.equal(parseDateValue(`${year}-03-04 17:41:12`)?.toISOString(), `${year}-03-04T09:41:12.000Z`);
    assert.equal(parseDateValue(`${year}-03-04T17:41`)?.toISOString(), `${year}-03-04T09:41:00.000Z`);
    assert.equal(parseDateValue(`${year}-03-04T17:41:00+08:00`)?.toISOString(), `${year}-03-04T09:41:00.000Z`);
    assert.equal(parseDateValue(`${year}-03-04T09:41:00Z`)?.toISOString(), `${year}-03-04T09:41:00.000Z`);
    assert.equal(parseDateValue("1970-01-01"), null);
    assert.equal(parseDateValue("not a date"), null);
  });

  it("ignores a stray <time> years older than the page's real one", () => {
    const d = doc(`<html><body><header><time datetime="2019-10-22">2019</time></header>
      <article><h1>Шүүхийн ерөнхий зөвлөлийн хуралдаан боллоо</h1><time datetime="${year}-03-04 17:41:12"></time><p>${"Текст. ".repeat(60)}</p></article></body></html>`);
    assert.equal(extractPublishedDate(d as unknown as Document, "https://judcouncil.mn/site/news/1", "")?.toISOString(), `${year}-03-04T09:41:12.000Z`);
  });

  it("prefers the headline's <time> and its printed text over a placeholder attribute (judcouncil.mn)", () => {
    // The article's <time> has a template placeholder in datetime and the real date as text; the
    // "latest news" list further down carries other articles' <time> elements.
    const d = doc(`<html><body><main><div class="row"><div class="col-md-8">
      <div class="post-title"><h1>Шүүхийн ерөнхий зөвлөлийн шүүгч бус гишүүд томилогдов</h1></div>
      <div class="post-atribute"><time datetime="2019-10-22"> ${year}-03-04 14:10:17 </time></div>
      <p>${"Текст. ".repeat(60)}</p></div>
      <div class="col-md-4"><h3><a href="/site/news_full/2">Өөр мэдээ</a></h3><time datetime="${year}-03-04 17:41:12">${year}-03-04 17:41:12</time></div>
      </div></main></body></html>`);
    assert.equal(extractPublishedDate(d as unknown as Document, "https://judcouncil.mn/site/news_full/1", "")?.toISOString(), `${year}-03-04T06:10:00.000Z`);
  });

  it("does not take a year-old date printed in the text as the publication date (mrpam.gov.mn)", () => {
    const text = "Эрдэс баялаг, газрын тосны газрын даргын 2009 оны 05 дугаар сарын 05-ны өдрийн тушаал. " + "Текст. ".repeat(40);
    const d = doc(`<html><body><article><h1>Тушаалын тухай</h1><p>${text}</p></article></body></html>`);
    assert.equal(extractPublishedDate(d as unknown as Document, "https://mrpam.gov.mn/article/100", text), null);
    // A recent date in the same place is still trusted.
    const recent = doc(`<html><body><article><h1>Тушаалын тухай</h1><p>${year}-01-15. ${"Текст. ".repeat(40)}</p></article></body></html>`);
    assert.equal(extractPublishedDate(recent as unknown as Document, "https://mrpam.gov.mn/article/100", `${year}-01-15. Текст.`)?.toISOString().slice(0, 10), `${year}-01-15`);
  });
});
