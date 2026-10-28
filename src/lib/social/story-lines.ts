import type { ReaderImpact } from "@/lib/types";

/**
 * The lines every social post shares, so a reader learns the whole story without leaving the feed
 * (Oct 2026 mission audit: 88 % of Mongolians are on Facebook and posts were "headline + link").
 * Facts only, from our stored data: "Танд хамаатай юу?" (already grounded in reader-view.ts), up to
 * two short checkable facts, and the AI's fact/PR estimate labelled as an estimate.
 */

/** "👤 Хэнд: …", "↻ Юу өөрчлөгдөх: …", "📅 Хэзээнээс: …", "✓ Юу хийх: …" (only the fields the text supports). */
export function impactLines(impact: ReaderImpact | null | undefined): string[] {
  if (!impact) return [];
  return [
    impact.who && `👤 Хэнд: ${impact.who}`,
    impact.change && `↻ Юу өөрчлөгдөх: ${impact.change}`,
    impact.when && `📅 Хэзээнээс: ${impact.when}`,
    impact.action && `✓ Юу хийх: ${impact.action}`,
  ].filter((l): l is string => Boolean(l));
}

const FACT_MAX = 160;
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/**
 * Up to `max` short facts for "📌" lines: one sentence each, not a repeat of the summary or of
 * another fact, and not just the amount the "💰" line already prints.
 */
export function keyFacts(facts: string[] | null | undefined, summary: string, max = 2): string[] {
  const seen = norm(summary);
  const out: string[] = [];
  for (const f of facts ?? []) {
    const t = f.replace(/\s+/g, " ").trim().replace(/[.;]$/, "");
    if (t.length < 12 || t.length > FACT_MAX) continue;
    const n = norm(t);
    if (seen.includes(n) || out.some((o) => norm(o) === n)) continue;
    // "Дүн: 4.5 тэрбум ₮" alone repeats the money line.
    if (/^[^\p{L}]*(дүн|төсөв|өртөг)?\s*:?\s*[\d.,\s]+\s*(их наяд|тэрбум|сая|мянга)?\s*₮?$/iu.test(t)) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** "📊 Баримт 72% · Пи-ар 28% (AI-ийн үнэлгээ, буруутгал биш)": the site's SpinMeter in words. */
export function factShareLine(neutrality: number | null | undefined): string | null {
  if (typeof neutrality !== "number" || !Number.isFinite(neutrality)) return null;
  const fact = Math.max(0, Math.min(100, Math.round(neutrality)));
  return `📊 Баримт ${fact}% · Пи-ар ${100 - fact}% (AI-ийн үнэлгээ, буруутгал биш)`;
}
