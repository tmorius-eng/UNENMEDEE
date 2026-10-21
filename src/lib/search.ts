/**
 * Full-text search helpers. Postgres has no Mongolian dictionary, so the "simple" config is
 * used with prefix matching; long words are cut to their first letters first because Mongolian
 * suffixes change the stem (төсөв → төсвийн, татвар → татварын).
 */
export const MAX_TERMS = 6;
/** Keep this many letters of longer words: Mongolian suffixes change the word ending (төсөв → төсвийн). */
export const STEM_LEN = 5;

/** User text → a safe to_tsquery() string like "төсв:* & тендер:*", or null when nothing is searchable. */
export function toPrefixQuery(raw: string): string | null {
  const terms = raw
    .toLowerCase()
    .normalize("NFC")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2)
    .slice(0, MAX_TERMS)
    .map((t) => (t.length > STEM_LEN + 1 ? t.slice(0, STEM_LEN) : t));
  return terms.length ? [...new Set(terms)].map((t) => `${t}:*`).join(" & ") : null;
}
