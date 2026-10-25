/**
 * "Hook" wording for social cards and posts: the strongest fact of a headline (its first number
 * with its unit and the next word, e.g. "61.8 сая мал") is shown in yellow. Rule-based, no AI:
 * the hook can only repeat what the fact-based headline already says, never add a claim.
 */
export interface HookWord {
  word: string;
  hot: boolean;
}

const NUMBER = /^[\d][\d.,]*%?$/;
/** "2026 оны", "2025 онд": a year is a date, not the fact worth highlighting. */
const YEAR = /^(19|20)\d{2}$/;
const YEAR_WORD = /^(он|оны|онд|оноос|оныг|онтой|оны,)$/i;
/** Punctuation around a number: "(250", "«61.8", "40%)". */
const strip = (w: string) => w.replace(/^[("«“'[]+/, "").replace(/[,.:;)»”'\]]+$/, "");
const UNIT = /^(хувь|хувиар|хувьтай|%|их|наяд|тэрбум|сая|мянга|мянган|₮|төгрөг|төгрөгийн|ам\.доллар|ам\.долларын|доллар|км|га|тонн|хүн|өрх|өрхийн)[,.:;]?$/i;

/** Splits a headline into words and marks the first number, its units and the word after them. */
export function hookWords(text: string): HookWord[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const start = words.findIndex((w, i) => {
    const n = strip(w);
    return NUMBER.test(n) && !(YEAR.test(n) && YEAR_WORD.test(words[i + 1] ?? ""));
  });
  if (start < 0) return words.map((word) => ({ word, hot: false }));
  let end = start;
  while (end + 1 < words.length && UNIT.test(words[end + 1]) && !/[,.:;]$/.test(words[end])) end++;
  // One more word ("мал", "сургууль") makes the number read as a fact, unless a clause ended.
  if (end + 1 < words.length && !/[,.:;]$/.test(words[end]) && end - start < 3 && /^[а-яөүёa-z]/i.test(words[end + 1])) end++;
  return words.map((word, i) => ({ word, hot: i >= start && i <= end }));
}

