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

/** True when the text contains a full day-level date ("2021-05-05", "2021 оны 5 сарын 5"). */
function hasFullDate(text: string): boolean {
  return /20\d{2}[./-]\d{1,2}[./-]\d{1,2}|20\d{2}\s*оны\s*\d{1,2}\s*(?:-р|дугаар|дүгээр)?\s*сарын\s*\d{1,2}/.test(text);
}

/**
 * True for an undated page that is an old post picked up from a site's archive: its text gives a
 * full date and names no year after the one before last. A current story that only mentions a
 * past year in passing ("2011 онд") has no full date and is not judged.
 */
export function looksOld(text: string, now = new Date()): boolean {
  const year = newestYearMentioned(text);
  return year !== null && year < now.getUTCFullYear() - 1 && hasFullDate(text);
}
