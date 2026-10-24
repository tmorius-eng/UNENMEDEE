import { createHash } from "node:crypto";

/**
 * Collapse whitespace, normalize Unicode and strip invisible characters: zero-width marks, the soft
 * hyphen and the "blank" letters (Hangul filler U+3164 / U+115F / U+1160, Braille blank U+2800,
 * halfwidth filler U+FFA0) that editors paste for an empty-looking first line.
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u3164\u115F\u1160\u2800\uFFA0]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** SHA-256 hex digest of the normalized text (CLAUDE.md rule #2). */
export function contentHash(text: string): string {
  return createHash("sha256").update(normalizeText(text), "utf8").digest("hex");
}

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "i",
  к: "k", л: "l", м: "m", н: "n", о: "o", ө: "u", п: "p", р: "r", с: "s", т: "t", у: "u",
  ү: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "y", ь: "", э: "e",
  ю: "yu", я: "ya",
};

/** URL-safe slug with Mongolian Cyrillic transliteration and a short hash suffix for uniqueness. */
export function slugify(title: string, uniqueSeed: string): string {
  const base = title
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join("")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  const suffix = createHash("sha256").update(uniqueSeed).digest("hex").slice(0, 8);
  return `${base || "medee"}-${suffix}`;
}

/** Truncate to roughly `maxChars`, cutting at a sentence or word boundary. */
export function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const cut = text.slice(0, maxChars);
  const sentence = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".\n"));
  if (sentence > maxChars * 0.6) return cut.slice(0, sentence + 1);
  const space = cut.lastIndexOf(" ");
  return `${cut.slice(0, space > 0 ? space : maxChars)}…`;
}
