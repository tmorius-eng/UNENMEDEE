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

/** Dated items older than this are stored but never published or analysed on a regular run. */
export const MAX_AGE_DAYS = 60;

/**
 * Whether a scraped item goes out as news. A dated item is news only inside the retention window
 * (a crawler reaching an archive page must not surface 2009 resolutions as today's); an undated
 * one is news unless its text proves it old. `null` = the column's default (published).
 */
export function publishDecision(publishedAt: Date | null, text: string, now = new Date(), maxAgeDays = MAX_AGE_DAYS): boolean | null {
  if (publishedAt) return publishedAt.getTime() < now.getTime() - maxAgeDays * 86_400_000 ? false : null;
  return looksOld(text, now) || isTimelessPage(text, now) ? false : null;
}

/**
 * An undated text that is not news: it names no year at all (a department page, instructions, a
 * biography, "nine wonders of the aimag") or its newest year is before last year (a 2020–2024
 * programme). Government news nearly always carries a current date or year; pages like these only
 * reached the crawler through section links and were filling the home page as "today's" stories.
 */
export function isTimelessPage(text: string, now = new Date()): boolean {
  const year = newestYearMentioned(text);
  return year === null || year < now.getUTCFullYear() - 1;
}

/** A day-level date (no time part): what a stray or copied date stamp looks like. */
export function isDayLevel(d: Date): boolean {
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
}
