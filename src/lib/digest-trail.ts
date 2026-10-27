/**
 * The digest a reader came from, kept for this tab only (sessionStorage), so the article page can
 * show "← Тойм · 3/10 · Дараагийнх →" and the reader never has to press Back and find their place.
 * Pure helpers (unit-tested); the hooks live in the client components.
 */
export const TRAIL_KEY = "iltod-digest-trail";

export interface TrailItem {
  id: number;
  slug: string;
  headline: string;
}

export interface DigestTrail {
  edition: number;
  items: TrailItem[];
}

export function parseTrail(raw: string | null | undefined): DigestTrail | null {
  if (!raw) return null;
  try {
    const t = JSON.parse(raw) as Partial<DigestTrail>;
    if (typeof t.edition !== "number" || !Array.isArray(t.items)) return null;
    const items = t.items.filter((i): i is TrailItem => typeof i?.id === "number" && typeof i?.slug === "string" && typeof i?.headline === "string");
    return items.length ? { edition: t.edition, items } : null;
  } catch {
    return null;
  }
}

export interface TrailPosition {
  /** 1-based position of this article in the digest. */
  n: number;
  total: number;
  current: TrailItem;
  next: TrailItem | null;
  /** Where "← Тойм" goes: the story's own row on /digest. */
  backHref: string;
}

/** This article's place in the trail, or null when the article is not part of it. */
export function trailPosition(trail: DigestTrail | null, slug: string): TrailPosition | null {
  if (!trail) return null;
  const i = trail.items.findIndex((it) => it.slug === slug);
  if (i < 0) return null;
  return { n: i + 1, total: trail.items.length, current: trail.items[i], next: trail.items[i + 1] ?? null, backHref: `/digest#${rowId(trail.edition, i + 1)}` };
}

/** The id of a story's row on /digest ("d42-3"), the target of "← Тойм". */
export function rowId(edition: number, n: number): string {
  return `d${edition}-${n}`;
}

export function saveTrail(trail: DigestTrail): void {
  try {
    sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail));
  } catch {
    /* storage unavailable: the article simply shows no bar */
  }
}

export function clearTrail(): void {
  try {
    sessionStorage.removeItem(TRAIL_KEY);
  } catch {
    /* nothing to clear */
  }
}

export function loadTrail(): string | null {
  try {
    return sessionStorage.getItem(TRAIL_KEY);
  } catch {
    return null;
  }
}
