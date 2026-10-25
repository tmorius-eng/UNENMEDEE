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
const UNIT = /^(хувь|хувиар|хувьтай|%|их|наяд|тэрбум|сая|мянга|мянган|₮|төгрөг|төгрөгийн|ам\.доллар|ам\.долларын|доллар|км|га|тонн|хүн|өрх|өрхийн)[,.:;]?$/i;

/** Splits a headline into words and marks the first number, its units and the word after them. */
export function hookWords(text: string): HookWord[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const start = words.findIndex((w) => NUMBER.test(w.replace(/[,.:;]+$/, "")));
  if (start < 0) return words.map((word) => ({ word, hot: false }));
  let end = start;
  while (end + 1 < words.length && UNIT.test(words[end + 1]) && !/[,.:;]$/.test(words[end])) end++;
  // One more word ("мал", "сургууль") makes the number read as a fact, unless a clause ended.
  if (end + 1 < words.length && !/[,.:;]$/.test(words[end]) && end - start < 3 && /^[а-яөүёa-z]/i.test(words[end + 1])) end++;
  return words.map((word, i) => ({ word, hot: i >= start && i <= end }));
}

