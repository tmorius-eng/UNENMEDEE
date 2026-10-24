import { normalizeText } from "@/lib/text";

import { isDateLine } from "./titles";

/**
 * Re-checking stored articles against their source page ("Эх хуудасны өөрчлөлт", /changes).
 *
 * A re-extracted page never matches the stored text byte for byte (view counters, "related news"
 * widgets, REST vs HTML text), so hashes are never compared. Instead: how many SENTENCES of our
 * stored copy can still be found on the page, and did any number in them change? Pure functions;
 * scripts/recheck-sources.ts does the fetching.
 */

/** Below this share of our sentences still on the page, the text counts as changed. */
export const CHANGED_BELOW = 0.8;
/** A page must 404 (or redirect away) on this many checks, at least GONE_MIN_DAYS apart. */
export const GONE_CHECKS = 2;
export const GONE_MIN_DAYS = 6;
/** Fresh text shorter than this means extraction failed: the check is skipped. */
export const MIN_FRESH_CHARS = 200;
/** Diff entries kept per changed article (~4 KB). */
export const MAX_DIFF = 12;

export type SourceStatus = "ok" | "changed" | "gone";

export interface SourceDiff {
  /** Our sentence and the most similar sentence on the page now. */
  pairs: { before: string; after: string }[];
  /** Our sentences with no similar sentence on the page any more. */
  removed: string[];
  /** Share of our sentences still found on the page (0-1). */
  containment: number;
}

const COUNTER = /\d[\d\s,.]*\s*(уншсан|үзсэн|views?|сэтгэгдэл)/iu;

/** Sentences worth comparing: no dates, counters or short menu-like lines. */
export function splitSentences(text: string): string[] {
  return normalizeText(text)
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 25 && !isDateLine(s) && !COUNTER.test(s));
}

/** For matching: lower case, unified quotes and dashes, letters/digits/spaces only. */
function key(s: string): string {
  return s
    .toLowerCase()
    .replace(/[«»“”„"'’`]/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^\p{L}\p{N}\s.,%-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const words = (s: string) => new Set(key(s).split(" ").filter((w) => w.length > 1));

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

const numbers = (s: string) => (s.match(/\d+(?:[.,]\d+)*/g) ?? []).join("|");

export interface Comparison extends SourceDiff {
  numbersChanged: boolean;
}

export function compareTexts(stored: string, fresh: string): Comparison {
  const ours = splitSentences(stored);
  const freshKey = key(normalizeText(fresh).replace(/\s+/g, " "));
  const theirs = splitSentences(fresh);
  const theirWords = theirs.map((s) => ({ s, w: words(s) }));
  const pairs: SourceDiff["pairs"] = [];
  const removed: string[] = [];
  let found = 0;
  for (const s of ours) {
    if (freshKey.includes(key(s))) {
      found++;
      continue;
    }
    const w = words(s);
    let best: { s: string; score: number } | null = null;
    for (const t of theirWords) {
      const score = jaccard(w, t.w);
      if (score >= 0.5 && (!best || score > best.score)) best = { s: t.s, score };
    }
    if (best) pairs.push({ before: s, after: best.s });
    else removed.push(s);
  }
  return {
    containment: ours.length ? found / ours.length : 1,
    pairs,
    removed,
    numbersChanged: pairs.some((p) => numbers(p.before) !== numbers(p.after)),
  };
}

export interface CheckState {
  status: SourceStatus | null;
  missingCount: number;
  checkedAt: Date | null;
}

/** What one fetch found: the page's text, or that it is gone (404/410, redirected away), or an error to ignore. */
export type FetchResult = { kind: "text"; text: string } | { kind: "missing" } | { kind: "error" };

export interface Decision {
  /** null = leave the stored status alone (this check proves nothing). */
  status: SourceStatus | null;
  missingCount: number;
  diff?: SourceDiff;
}

export function decide(prev: CheckState, stored: string, result: FetchResult, now = new Date()): Decision {
  if (result.kind === "error") return { status: null, missingCount: prev.missingCount };
  if (result.kind === "missing") {
    // Count a miss only once per GONE_MIN_DAYS, so two misses are really days apart.
    const spaced = !prev.checkedAt || prev.missingCount === 0 || now.getTime() - prev.checkedAt.getTime() >= GONE_MIN_DAYS * 86_400_000;
    const missingCount = spaced ? prev.missingCount + 1 : prev.missingCount;
    return { status: missingCount >= GONE_CHECKS ? "gone" : null, missingCount };
  }
  if (result.text.length < MIN_FRESH_CHARS) return { status: null, missingCount: prev.missingCount };
  const c = compareTexts(stored, result.text);
  if (c.containment < CHANGED_BELOW || c.numbersChanged) {
    return {
      status: "changed",
      missingCount: 0,
      diff: { containment: Math.round(c.containment * 100) / 100, pairs: c.pairs.slice(0, MAX_DIFF), removed: c.removed.slice(0, Math.max(0, MAX_DIFF - c.pairs.length)) },
    };
  }
  return { status: "ok", missingCount: 0 };
}
