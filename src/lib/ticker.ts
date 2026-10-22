/**
 * Pure helpers for the home page's rotating status line (status-ticker.tsx). No React here, so
 * the maths is unit-tested and shared with the server query that counts today's news.
 */

const HOUR = 3_600_000;

/** The news pipeline's cron runs every 2 hours on even UTC hours ("0 *\/2 * * *"). */
export function nextRunAt(now: number): number {
  const d = new Date(now);
  d.setUTCMinutes(0, 0, 0);
  const h = d.getUTCHours();
  d.setUTCHours(h + (h % 2 === 0 ? 2 : 1));
  return d.getTime();
}

/** "1 ц 35 мин", "40 мин" until the next pipeline run. */
export function nextRunLabel(now: number): string {
  const min = Math.max(1, Math.ceil((nextRunAt(now) - now) / 60_000));
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} ц ${m} мин` : `${m} мин`;
}

/** Midnight in Ulaanbaatar (UTC+8, no DST) at or before `now`, as a UTC timestamp. */
export function ubMidnight(now: number): number {
  const ub = new Date(now + 8 * HOUR);
  return Date.UTC(ub.getUTCFullYear(), ub.getUTCMonth(), ub.getUTCDate()) - 8 * HOUR;
}
