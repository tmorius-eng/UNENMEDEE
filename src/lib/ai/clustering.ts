import type { ExtractedEntities } from "@/lib/types";

/** Similarity at or above this joins two articles into one cluster (project spec). */
export const CLUSTER_THRESHOLD = 0.45;
/** Only articles from the last N days are cluster candidates. */
export const CLUSTER_WINDOW_DAYS = 7;

/** High-frequency Mongolian function words and boilerplate. */
const STOPWORDS = new Set(
  `ба болон бөгөөд нь юм байна байсан байгаа байх энэ тэр эдгээр тэдгээр гэж гэсэн гэв зэрэг оны он сарын сар өдөр өдрийн
  хүрээнд тухай бол ч л мөн дээр доор руу рүү уу үү хийх хийсэн хийлээ болно боллоо болсон түүнчлэн мэдээлэл мэдээ
  монгол улсын улс аймгийн аймаг сумын хотын яамны яам газрын газар хэлтэс төв байгууллага ажил ажлын хурал хуралдаан
  нэг хоёр гурав дөрөв тав зарим бүх олон их бага шинэ ихээхэн цаашид өнөөдөр`
    .split(/\s+/)
    .filter(Boolean),
);

/**
 * Tokenizes Mongolian/English text into crude stems. Mongolian is agglutinative
 * (тендер, тендерийн, тендерт), so we keep the first 6 letters of each word.
 */
export function stems(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w) && !/^\d{1,2}$/.test(w))
    .map((w) => (/^\d+$/.test(w) ? w : w.slice(0, 6)));
}

export function shingles(tokens: string[], size = 2): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + size <= tokens.length; i++) out.add(tokens.slice(i, i + size).join(" "));
  return out;
}

export function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

export interface ClusterDoc {
  id: number;
  title: string;
  /** TL;DR + facts (preferred) or the first part of the article. */
  summary: string;
  entities: ExtractedEntities | null;
  clusterId: number | null;
}

function entityKeys(e: ExtractedEntities | null): Set<string> {
  if (!e) return new Set();
  return new Set(
    [...e.people, ...e.orgs, ...e.amounts_mnt].map((x) => x.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "")).filter((x) => x.length >= 3),
  );
}

/** Below this word overlap, shared entities alone (e.g. "УИХ") cannot join two stories. */
const MIN_STEM_OVERLAP = 0.25;

/**
 * Lightweight similarity: max of
 *  - bigram shingle Jaccard (near-duplicate wording across outlets), and
 *  - 0.7 × stem-set Jaccard + 0.3 × entity-overlap Jaccard (same story, different words),
 *    counted only when the stems already overlap meaningfully.
 */
export function similarity(a: ClusterDoc, b: ClusterDoc): number {
  const ta = stems(`${a.title} ${a.title} ${a.summary}`);
  const tb = stems(`${b.title} ${b.title} ${b.summary}`);
  const shingleScore = jaccard(shingles(ta), shingles(tb));
  const stemScore = jaccard(new Set(ta), new Set(tb));
  if (stemScore < MIN_STEM_OVERLAP) return shingleScore;
  const ea = entityKeys(a.entities);
  const eb = entityKeys(b.entities);
  const entityScore = ea.size && eb.size ? jaccard(ea, eb) : stemScore;
  return Math.max(shingleScore, 0.7 * stemScore + 0.3 * entityScore);
}

/** Best match at or above the threshold, or null. */
export function findBestMatch(doc: ClusterDoc, candidates: ClusterDoc[]): { doc: ClusterDoc; score: number } | null {
  let best: { doc: ClusterDoc; score: number } | null = null;
  for (const c of candidates) {
    if (c.id === doc.id) continue;
    const score = similarity(doc, c);
    if (score >= CLUSTER_THRESHOLD && (!best || score > best.score)) best = { doc: c, score };
  }
  return best;
}
