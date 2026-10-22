/**
 * Pure date heuristics shared by the DB sink and the backfill script (no jsdom here).
 */

/** Newest year (2000–2100) the text mentions, or null. */
export function newestYearMentioned(text: string): number | null {
  let max: number | null = null;
  for (const m of text.matchAll(/(?<!\d)(20\d{2})(?!\d)/g)) {
    const y = +m[1];
    if (y <= 2100 && (max === null || y > max)) max = y;
  }
  return max;
}

/**
 * True for an undated page whose text only mentions years before last year: an old post picked
 * up from a site's archive, not today's news. Text that names no year at all is not judged.
 */
export function looksOld(text: string, now = new Date()): boolean {
  const year = newestYearMentioned(text);
  return year !== null && year < now.getUTCFullYear() - 1;
}
