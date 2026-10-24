import { normalizeText } from "@/lib/text";

/**
 * Headline helpers shared by the extractors, the DB sink and the title backfill (no jsdom here).
 *
 * Some government sites put the same page title on every article ("Мэдээ | ТТХГ", "Нүүр хуудас",
 * the agency name), so a headline is only trusted when it is not one of those.
 */

/** Words a site uses for a section or its homepage, never for one story. */
const SECTION_WORDS = new Set(
  [
    "мэдээ",
    "мэдээ мэдээлэл",
    "мэдээлэл",
    "шинэ мэдээ",
    "сүүлийн мэдээ",
    "цаг үеийн мэдээ",
    "үйл явдал",
    "нүүр",
    "нүүр хуудас",
    "эхлэл",
    "дэлгэрэнгүй",
    "home",
    "news",
    "read",
  ].map((w) => w.toLowerCase()),
);

const SEPARATOR = /\s*[|–—]\s*|\s+-\s+/;

function norm(s: string): string {
  return normalizeText(s).replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * True when `title` names the site or a section rather than one article: section words,
 * the site's own name (alone or combined with a section word), or fewer than 8 characters.
 */
export function isGenericTitle(title: string, siteNames: (string | null | undefined)[] = []): boolean {
  const clean = normalizeText(title).replace(/\s+/g, " ").trim();
  if (clean.length < 8) return true;
  const names = siteNames.map((n) => (n ? norm(n) : "")).filter((n) => n.length >= 2);
  return clean
    .split(SEPARATOR)
    .filter(Boolean)
    .every((part) => {
      const p = part.toLowerCase();
      return (
        SECTION_WORDS.has(p) ||
        names.some((n) => p === n || (p.length >= 8 && n.startsWith(p))) ||
        // An agency abbreviation on its own: "ТТХГ", "ЭМЯ", "IAAC".
        /^[A-ZА-ЯЁӨҮ]{2,6}$/u.test(part) ||
        p.length < 3
      );
    });
}

/** A line that is only a date ("2026 оны 10 -р сарын 21, Лхагва", "2026-10-21 10:30"). */
function isDateLine(line: string): boolean {
  const rest = line
    .replace(/20\d{2}\s*оны\s*\d{1,2}\s*(?:-р|дугаар|дүгээр)?\s*сарын\s*\d{1,2}/g, "")
    .replace(/20\d{2}[./-]\d{1,2}[./-]\d{1,2}(?:[ T]\d{1,2}:\d{2}(?::\d{2})?)?/g, "")
    .replace(/[,.\s]*(Даваа|Мягмар|Лхагва|Пүрэв|Баасан|Бямба|Ням)?[,.\s]*/g, "");
  return rest.length < 6;
}

/**
 * Menu or link text glued together by the extractor ("ХолбоосуудТөрийн байгууллагаСалбаруудын…"):
 * the page is a homepage or a menu, not an article.
 */
export function looksLikeNavigation(text: string): boolean {
  const head = normalizeText(text).slice(0, 300);
  return (
    (head.match(/[а-яөүёa-z][А-ЯӨҮЁA-Z]/gu)?.length ?? 0) >= 3 ||
    (head.match(/>/g)?.length ?? 0) >= 2 ||
    // A news listing with view counters ("2023-06-08 1932 уншсан") or a menu that opens the page.
    (head.match(/\d\s*уншсан/g)?.length ?? 0) >= 2 ||
    /^(Бидний тухай|Нүүр хуудас|Нүүр|Home|ENG)\s/u.test(head) ||
    // Nothing that reads like a headline at all (login pages: "Нэвтрэх").
    isGenericTitle(firstSentenceTitle(text))
  );
}

/** The first sentence of the text as a headline (≤ 110 characters, cut at a word). */
export function firstSentenceTitle(text: string, max = 110): string {
  const lines = normalizeText(text)
    .split(/\n+|(?<=[.!?])\s+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && !isDateLine(l));
  let pick = lines.find((l) => l.length >= 20 && !isGenericTitle(l)) ?? lines[0] ?? "";
  // A listing line glued to its date and view counter: "Гарчиг 2023-06-081932 уншсан…".
  const beforeDate = pick.split(/\s+(?=20\d{2}[./-]\d{1,2}[./-]\d{1,2})/)[0];
  if (beforeDate.length >= 20) pick = beforeDate;
  if (pick.length <= max) return pick.replace(/[.\s]+$/, "");
  const cut = pick.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > 60 ? cut.slice(0, space) : cut).replace(/[\s,;:–—-]+$/, "")}…`;
}

/** First candidate that is a real headline, else the text's first sentence. */
export function chooseTitle(candidates: (string | null | undefined)[], text: string, siteNames: (string | null | undefined)[] = []): string {
  for (const c of candidates) {
    const t = c ? normalizeText(c).replace(/\s+/g, " ").trim() : "";
    if (t && !isGenericTitle(t, siteNames)) return t;
  }
  return firstSentenceTitle(text);
}

/** Abbreviations that stay in capitals when a shouting headline is lowered (lowercase suffixes follow a hyphen: "УИХ-ын"). */
const ACRONYMS = new Set(
  "АНУ ОХУ БНХАУ БНСУ ХБНГУ ИБУИНВУ НҮБ ЕХ ОУВС ДБ АХБ ДЭМБ ЮНЕСКО ЮНИСЕФ НАТО УИХ ЗГ ЗГХЭГ ТӨК ТӨХК ХХК ХК ТББ ХХОАТ НӨАТ НДШ ААНОАТ ДНБ ГВУН ЕБС ИТХ АТГ ЦЕГ ТЕГ ГЕГ ШШГЕГ ҮАГ ҮСХ ХАСХОМ ХҮН МАН АН ИЗНН МҮЭ МУ УБ ХУД СХД БЗД СБД ЧД БГД НХД БНД СХД ЭМЯ БШУЯ ГХЯ СЯ ЗТХЯ ХЗДХЯ БОАЖЯ ЭБЯ УУХҮЯ ХНХЯ ЭЗХЯ ХХААХҮЯ БХЯ ЗЗЯ ЦДС ДЦС АЦС МСҮТ ЖДҮ ТУЗ IT AI USD COVID".split(" "),
);

/** Proper-noun stems that keep a capital first letter ("МОНГОЛЫН" → "Монголын"). */
const PROPER = ["МОНГОЛ", "УЛААНБААТАР", "ДАРХАН", "ЭРДЭНЭТ", "ХЯТАД", "ОРОС", "ЯПОН", "СОЛОНГОС", "АМЕРИК", "ЕВРОП", "ГЕРМАН", "ФРАНЦ", "ЭНЭТХЭГ", "КАЗАХСТАН", "КАНАД", "АВСТРАЛИ", "ТУРК", "АНГЛИ", "БРИТАНИ", "ТАЙВАН", "ОЮУ ТОЛГОЙ", "ТАВАН ТОЛГОЙ"];

const UPPER = /\p{Lu}/gu;
const LETTER = /\p{L}/gu;

/**
 * Headlines some sites publish in capitals ("“1072 ХУВЬЦАА” НЭЭЛТТЭЙ ӨДӨРЛӨГ…") become sentence
 * case; abbreviations, initials ("Х.БАТТУЛГА" → "Х.Баттулга") and common proper nouns keep their
 * capitals. Mixed-case titles are returned unchanged.
 */
export function unshoutTitle(title: string): string {
  const letters = title.match(LETTER)?.length ?? 0;
  const upper = title.match(UPPER)?.length ?? 0;
  const words = title.split(/\s+/).filter((w) => (w.match(LETTER)?.length ?? 0) >= 2).length;
  if (letters < 12 || words < 3 || upper / letters < 0.7) return title;

  const lowered = title.replace(/[\p{L}\d]+(?:[.][\p{L}]+)?/gu, (w) => {
    if (ACRONYMS.has(w) || /\d/.test(w) || /^[A-Z]+$/.test(w)) return w;
    const initial = /^(\p{Lu})\.(\p{L})(\p{L}*)$/u.exec(w); // "Х.БАТТУЛГА"
    if (initial) return `${initial[1]}.${initial[2]}${initial[3].toLowerCase()}`;
    const lower = w.toLowerCase();
    return PROPER.some((p) => !p.includes(" ") && w.startsWith(p)) ? lower[0].toUpperCase() + lower.slice(1) : lower;
  });
  let out = lowered;
  for (const p of PROPER.filter((x) => x.includes(" "))) {
    const lowerP = p.toLowerCase();
    out = out.replaceAll(lowerP, lowerP.replace(/(^|\s)(\p{L})/gu, (_, s: string, c: string) => s + c.toUpperCase()));
  }
  // Capital at the start of the title and of every sentence (skipping opening quotes).
  return out.replace(/(^|[.!?]\s+)([^\p{L}\d]*)(\p{Ll})/gu, (_, a: string, b: string, c: string) => a + b + c.toUpperCase());
}
