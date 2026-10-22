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
  return (head.match(/[а-яөүёa-z][А-ЯӨҮЁA-Z]/gu)?.length ?? 0) >= 3 || (head.match(/>/g)?.length ?? 0) >= 2;
}

/** The first sentence of the text as a headline (≤ 110 characters, cut at a word). */
export function firstSentenceTitle(text: string, max = 110): string {
  const lines = normalizeText(text)
    .split(/\n+|(?<=[.!?])\s+/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l && !isDateLine(l));
  const pick = lines.find((l) => l.length >= 20 && !isGenericTitle(l)) ?? lines[0] ?? "";
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
