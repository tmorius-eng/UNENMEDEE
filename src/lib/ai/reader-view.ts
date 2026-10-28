import type { ReaderImpact } from "@/lib/types";

/**
 * The reader's view of a story (Oct 2026 mission audit): government headlines stay in the
 * government's words ("… Бүгд Найрамдах Солонгос Улсын Ерөнхийлөгч Ли Жэ Мёнтэй албан ёсны
 * хэлэлцээ хийлээ", 64 of 586 over 120 characters), and nothing told a reader whether a story
 * touches them. Young readers skip news that "has nothing to do with me" (Reuters Institute 2025);
 * Axios-style "why it matters" lines answer that.
 *
 * Tier 1 now writes a plain headline and four "Танд хамаатай юу?" fields. A model may invent a
 * number, so every number it writes must already be in the source (title, text, date), and every
 * field the text does not support stays null: nothing is shown rather than a guess.
 */

export const READER_TITLE_MAX = 100;
const READER_TITLE_MIN = 12;
const LIMITS: Record<keyof ReaderImpact, number> = { who: 70, change: 220, when: 50, action: 220 };

/** Placeholders models write instead of null. */
const EMPTY = /^(null|none|n\/a|үгүй|байхгүй|тодорхойгүй|мэдээлэлгүй|дурдаагүй|текстэд\s+(байхгүй|дурдаагүй|тодорхойгүй)|-|—|–)\.?$/i;

/** "4 500", "1,250.5", "600,000" → digits only; a month number ("11-р сар", "11 сарын") is not checked. */
function numbersIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\d(?:[\d\s,.'\u00a0\u202f]*\d)?/g)) {
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 14);
    if (/^\s*-?\s*(р|дүгээр|дугаар|дүгээр)?\s*сар/i.test(after) && Number(m[0]) <= 12) continue;
    out.push(m[0].replace(/\D/g, ""));
  }
  return out;
}

/** The source's digits with thousand separators removed, so "600,000" and "600000" match. */
export function sourceDigits(source: string): string {
  return source.replace(/(?<=\d)[\s,.'\u00a0\u202f]{1,2}(?=\d)/g, "");
}

/** Every number in `text` appears in the source (as written, or with separators removed). */
export function numbersGrounded(text: string, digits: string | null): boolean {
  return digits === null || numbersIn(text).every((n) => digits.includes(n));
}

function clean(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const s = raw
    .replace(/\s+/g, " ")
    .replace(/^["'«“„\s]+|["'»”\s]+$/g, "")
    .trim();
  if (!s || EMPTY.test(s) || s.length > max) return null;
  // "хөгжлийн бэрхшээлтэй иргэд" → "Хөгжлийн …"; a Latin start ("e-Mongolia") stays as written.
  return /^[а-яёөү]/.test(s) ? s[0].toUpperCase() + s.slice(1) : s;
}

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * The plain headline, or null: too short or long, all capitals, the same as the original, or a
 * number the source never printed (`digits` null = shape checks only, as in the zod schema).
 */
export function cleanReaderTitle(raw: unknown, original: string, digits: string | null): string | null {
  const t = clean(raw, READER_TITLE_MAX)?.replace(/\.$/, "");
  if (!t || t.length < READER_TITLE_MIN) return null;
  if (t === t.toUpperCase() && /\p{L}{4}/u.test(t)) return null;
  if (norm(t) === norm(original)) return null;
  if (!numbersGrounded(t, digits)) return null;
  return t;
}

/** "Танд хамаатай юу?" fields, each checked alone; null when the text supports none of them. */
export function cleanImpact(raw: unknown, digits: string | null): ReaderImpact | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const field = (k: keyof ReaderImpact) => {
    const v = clean(r[k], LIMITS[k]);
    return v && numbersGrounded(v, digits) ? v : null;
  };
  const impact: ReaderImpact = { who: field("who"), change: field("change"), when: field("when"), action: field("action") };
  // "Хэзээнээс" must name a time: a date, a month, a year or a relative day.
  if (impact.when && !/\d|сар|өнөөдр|маргааш|ирэх|энэ\s+(жил|долоо|сар)|он(ы|д)?(?!\p{L})/iu.test(impact.when)) impact.when = null;
  // "Хэнд" alone ("бүх иргэд") says nothing: keep it only with what changes or what to do.
  if (!impact.change && !impact.action) return null;
  return impact;
}

/** The source a Tier-1 answer is checked against: headline, text and the publication date. */
export function groundingSource(title: string, text: string, publishedAt: Date | null): string {
  return sourceDigits(`${title}\n${text}\n${publishedAt ? publishedAt.toISOString().slice(0, 10) : ""}`);
}
