/**
 * Pure helpers for the home page's rotating status line (status-ticker.tsx). No React here, so
 * the maths is unit-tested and shared with the server query that counts today's news.
 */

const HOUR = 3_600_000;

/** Minute past the hour the pipeline's crons fire at: :17 on even UTC hours, :47 on odd ones. */
export const PIPELINE_MINUTE = 17;
export const PIPELINE_MINUTE_ODD = 47;

/**
 * The next scheduled pipeline attempt ("17 *\/2 * * *" and "47 1-23/2 * * *": one an hour, off the
 * congested minute 0). GitHub may still skip an attempt under load, so this is the earliest time.
 */
export function nextRunAt(now: number): number {
  const d = new Date(now);
  for (let i = 0; i < 4; i++) {
    const h = d.getUTCHours();
    d.setUTCHours(h, h % 2 === 0 ? PIPELINE_MINUTE : PIPELINE_MINUTE_ODD, 0, 0);
    if (d.getTime() > now) return d.getTime();
    d.setUTCHours(h + 1, 0, 0, 0);
  }
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
