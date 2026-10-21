/**
 * "Миний гишүүн": readers pick their aimag/district, follow its MPs, and get one push when a
 * followed MP is named in new articles. Client-safe helpers (no zod / push code: this file is
 * reached from the header's PWA hook); the alert builder lives in ./follow-alerts.ts.
 */
export const FOLLOW_KEY = "iltod-follow";
export const AREA_KEY = "iltod-area";
export const MAX_FOLLOWS = 30;

/** "Дархан-Уул, Сэлэнгэ, Төв" → its areas. */
export function constituencyAreas(constituency: string | null): string[] {
  return (constituency ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

export function allAreas(constituencies: (string | null)[]): string[] {
  return [...new Set(constituencies.flatMap(constituencyAreas))].sort((a, b) => a.localeCompare(b, "mn"));
}

export function parseFollows(raw: string | null | undefined): number[] {
  try {
    const ids = JSON.parse(raw ?? "[]");
    return Array.isArray(ids) ? [...new Set(ids.filter((x): x is number => Number.isInteger(x) && x > 0))].slice(0, MAX_FOLLOWS) : [];
  } catch {
    return [];
  }
}
