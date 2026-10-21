/**
 * Reading progress kept in this browser only: which stories were read (shared by the home
 * StoryList and the /digest tracker) and the daily digest streak. Pure helpers, unit-tested.
 */
export const READ_KEY = "iltod-read";
export const READ_MAX = 600;
export const STREAK_KEY = "iltod-streak";

export function parseIds(raw: string): Set<number> {
  try {
    const ids = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids.filter((x): x is number => typeof x === "number") : []);
  } catch {
    return new Set();
  }
}

export function addIds(raw: string, ids: number[]): string {
  const next = parseIds(raw);
  for (const id of ids) next.add(id);
  return JSON.stringify([...next].slice(-READ_MAX));
}

/** Ulaanbaatar calendar day (UTC+8, no DST), e.g. "2026-10-21". */
export function ubDay(now: number): string {
  return new Date(now + 8 * 3_600_000).toISOString().slice(0, 10);
}

function prevDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}

export interface Streak {
  /** last day a digest was finished */
  d: string;
  /** consecutive days up to `d` */
  n: number;
}

export function parseStreak(raw: string): Streak | null {
  try {
    const s = JSON.parse(raw);
    return typeof s?.d === "string" && Number.isInteger(s?.n) && s.n > 0 ? { d: s.d, n: s.n } : null;
  } catch {
    return null;
  }
}

/** Finishing a digest today: same day keeps the count, yesterday continues it, older restarts. */
export function bumpStreak(prev: Streak | null, today: string): Streak {
  if (prev?.d === today) return prev;
  return { d: today, n: prev?.d === prevDay(today) ? prev.n + 1 : 1 };
}

/** The streak as shown today: alive if the last finish was today or yesterday. */
export function currentStreak(prev: Streak | null, today: string): number {
  return prev && (prev.d === today || prev.d === prevDay(today)) ? prev.n : 0;
}
