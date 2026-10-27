/**
 * Day archive helpers (/archive/<yyyy-mm-dd>): pure date maths in Ulaanbaatar time (UTC+8, no
 * DST), shared by the pages, the queries and the sitemap. No React or database here.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const UB_OFFSET = 8 * HOUR;

/** "2026-10-26" → the same string when it is a real calendar day, else null. */
export function parseArchiveDate(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 2000 || y > 2100) return null;
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d ? value : null;
}

/** The Ulaanbaatar day a timestamp falls on, as "yyyy-mm-dd". */
export function ubDateKey(ms: number): string {
  return new Date(ms + UB_OFFSET).toISOString().slice(0, 10);
}

/** [start, end) of an Ulaanbaatar day as UTC timestamps. */
export function ubDayBounds(date: string): [number, number] {
  const start = Date.parse(`${date}T00:00:00Z`) - UB_OFFSET;
  return [start, start + DAY];
}

/** The day `n` days after `date` (negative goes back). */
export function shiftDate(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

/** The last `days` Ulaanbaatar days up to and including today's, newest first. */
export function recentDates(now: number, days: number): string[] {
  const today = ubDateKey(now);
  return Array.from({ length: days }, (_, i) => shiftDate(today, -i));
}

/**
 * Genitive ending of a day number: "1-ний", "4-ний", "9-ний" (нэг, дөрөв, ес take front vowels),
 * "26-ны", "10-ны", "20-ны" otherwise.
 */
export function dayGenitive(day: number): string {
  return `${day}-${[1, 4, 9].includes(day % 10) ? "ний" : "ны"}`;
}

/** "2026 оны 10-р сарын 26-ны" (for "... мэдээ"). */
export function archiveDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return `${y} оны ${m}-р сарын ${dayGenitive(d)}`;
}

/** "10-р сарын 26" (short, for link lists). */
export function archiveShortLabel(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return `${m}-р сарын ${d}`;
}

/** "09:05" in Ulaanbaatar. */
export function ubTime(date: Date | string): string {
  return new Date(new Date(date).getTime() + UB_OFFSET).toISOString().slice(11, 16);
}
