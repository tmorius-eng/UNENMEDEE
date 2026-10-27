/**
 * Which story pages we offer to search engines. Minor notices (a training held, a festival, a new
 * dataset listing) stay readable and linked on the site but are `noindex, follow`: hundreds of
 * one-paragraph pages would make search engines rate the whole site as thin.
 */

/** Feeds hide stories below this importance (0-100 from Tier 1); the same line marks thin pages. */
export const FEED_MIN_IMPORTANCE = Number(process.env.FEED_MIN_IMPORTANCE ?? 25);

/** legalinfo.mn acts are short but are the law itself: always indexed. */
const ALWAYS_INDEXED = new Set(["legalinfo.mn"]);

export interface ThinCheck {
  importanceScore: number | null;
  clusterId: number | null;
  amounts: string[];
  sourceDomain: string;
}

/**
 * Thin = low importance AND no other source reported it AND it names no ₮ amount AND it is not a
 * legal act. An unscored story (null) is not thin. Mirrored in SQL by `INDEXABLE` in queries.ts.
 */
export function isThinArticle(a: ThinCheck): boolean {
  if (a.importanceScore === null || a.importanceScore >= FEED_MIN_IMPORTANCE) return false;
  return a.clusterId === null && a.amounts.length === 0 && !ALWAYS_INDEXED.has(a.sourceDomain);
}

export const INDEXED_DOMAINS = [...ALWAYS_INDEXED];
