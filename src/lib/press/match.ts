import { stems } from "@/lib/ai/clustering";

/**
 * Which press stories cover which government stories (Oct 2026 mission audit: 4 clusters in two
 * weeks, and no way to see whether the independent press wrote about a decision at all). Ground
 * News shows "who covered it" and the "blindspot"; this is the same idea, from headlines only.
 *
 * TF-IDF cosine (smoothed IDF, 5-letter stems) of the government headline twice + the first summary
 * sentence against the press headline alone. Calibrated on Oct 25-28 2026 (ikon.mn, news.mn,
 * sonin.mn against 160 published stories). Headlines alone gave fewer false pairs than headline +
 * lead (weather notes matched each other). Every pair at ≥ 0.45 was the same event, worded
 * differently included ("Төрийн үйлчилгээний 52 мянган албан хаагчийн үндсэн цалинг нэмэгдүүллээ"
 * ↔ ikon's "ТАНИЛЦ: Ирэх сарын 1-нээс нэмэгдэх төрийн үйлчилгээний албан хаагчийн цалингийн дүн",
 * 0.53); 0.43 was two different conferences. Routine news of the same shape about different people
 * ("УИХ-ын гишүүн О.Батнайрамдал “Нээлттэй парламент” танхимд ажиллалаа" vs another MP) is rejected
 * by `namesClash`.
 */
export const PRESS_MATCH_MIN = 0.45;
/** A press story can follow a government post by days (analysis) or precede it slightly (leaks, live). */
export const PRESS_BEFORE_DAYS = 2;
export const PRESS_AFTER_DAYS = 5;

export interface GovDoc {
  id: number;
  title: string;
  summary: string;
  publishedAt: Date | null;
}

export interface PressDoc {
  id: number;
  title: string;
  publishedAt: Date | null;
}

export interface PressMatch {
  articleId: number;
  pressId: number;
  score: number;
}

type Vec = Map<string, number>;

/** "Х.Баттулга", "Б.Энх-Амгалан": a person named in a headline. */
const PERSON = /[А-ЯЁӨҮ]\.\s?[А-ЯЁӨҮ][а-яёөү]+(?:-[А-ЯЁӨҮ][а-яёөү]+)?/g;

export function peopleIn(title: string): Set<string> {
  return new Set([...title.matchAll(PERSON)].map((m) => m[0].replace(/\s/g, "").slice(0, 8).toLowerCase()));
}

/** Both headlines name people and none of them is the same: two different people's routine news. */
export function namesClash(a: string, b: string): boolean {
  const pa = peopleIn(a);
  const pb = peopleIn(b);
  if (pa.size === 0 || pb.size === 0) return false;
  for (const p of pa) if (pb.has(p)) return false;
  return true;
}

function vectorize(tokens: string[], idf: (t: string) => number): Vec {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const v: Vec = new Map();
  for (const [t, c] of tf) v.set(t, (1 + Math.log(c)) * idf(t));
  return v;
}

export function cosine(a: Vec, b: Vec): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const x of a.values()) na += x * x;
  for (const x of b.values()) nb += x * x;
  for (const [t, x] of a) dot += x * (b.get(t) ?? 0);
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

/**
 * Clustering's 6-letter stems are one letter too long across outlets ("хаагчийн" / "хаагчдын",
 * "цалинг" / "цалин"); search uses 5 for the same reason (src/lib/search.ts).
 */
const terms = (text: string) => stems(text).map((t) => (/^\d+$/.test(t) ? t : t.slice(0, 5)));

const govText = (g: GovDoc) => `${g.title} ${g.title} ${g.summary.split("\n")[0] ?? ""}`;
const pressText = (p: PressDoc) => p.title;

function inWindow(gov: Date | null, press: Date | null): boolean {
  if (!gov || !press) return true;
  const days = (press.getTime() - gov.getTime()) / 86_400_000;
  return days >= -PRESS_BEFORE_DAYS && days <= PRESS_AFTER_DAYS;
}

/** Every (government story, press story) pair at or above `min`; the document frequencies come from both sets. */
export function matchPress(gov: GovDoc[], press: PressDoc[], min = PRESS_MATCH_MIN): PressMatch[] {
  const govTokens = gov.map((g) => terms(govText(g)));
  const pressTokens = press.map((p) => terms(pressText(p)));
  const df = new Map<string, number>();
  for (const doc of [...govTokens, ...pressTokens]) for (const t of new Set(doc)) df.set(t, (df.get(t) ?? 0) + 1);
  const n = govTokens.length + pressTokens.length;
  // Smoothed (scikit-learn style): stable on a small set too; a word in every document still weighs 1.
  const idf = (t: string) => Math.log((n + 1) / (1 + (df.get(t) ?? 0))) + 1;
  const gv = govTokens.map((t) => vectorize(t, idf));
  const pv = pressTokens.map((t) => vectorize(t, idf));
  const out: PressMatch[] = [];
  press.forEach((p, i) => {
    gov.forEach((g, j) => {
      if (!inWindow(g.publishedAt, p.publishedAt)) return;
      const score = cosine(gv[j], pv[i]);
      if (score < min || namesClash(g.title, p.title)) return;
      out.push({ articleId: g.id, pressId: p.id, score: Math.round(score * 1000) / 1000 });
    });
  });
  return out;
}
