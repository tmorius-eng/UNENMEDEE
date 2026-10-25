import { amountValue, formatNumber } from "@/lib/format";

/**
 * "Хүн бүрт хуваавал": a big ₮ amount divided by everyone living in Mongolia, so a reader can
 * picture "48.5 тэрбум ₮". Plain division, worded as such ("3.43 сая хүнд хуваавал"): it does
 * not say every person pays it.
 *
 * Population: residents of Mongolia at the end of 2025, National Statistics Office table
 * DT_NSO_0300_001V2 (data.1212.mn, updated 2026-04-09). Update once a year when the NSO
 * publishes the new year-end figure.
 */
export const POPULATION = { count: 3_425_162, year: 2025, source: "ҮСХ (DT_NSO_0300_001V2)" } as const;

/** Below 1 тэрбум ₮ a share is a few hundred ₮ at most: not worth a line. */
export const PER_PERSON_MIN = 1e9;

/** The largest parsable ₮ amount divided by the population, or null when there is none big enough. */
export function perPersonShare(amounts: string[]): number | null {
  const values = amounts.map(amountValue).filter((v): v is number => v !== null);
  const top = values.length ? Math.max(...values) : 0;
  return top >= PER_PERSON_MIN ? top / POPULATION.count : null;
}

/** "≈ 290₮", "≈ 14,200₮", "≈ 1.2 сая ₮": rounded so it never looks more precise than it is. */
export function formatShare(share: number): string {
  if (share >= 1e6) return `≈ ${(share / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })} сая ₮`;
  const step = share < 1000 ? 10 : 100;
  return `≈ ${formatNumber(Math.round(share / step) * step)}₮`;
}

/** "3.43 сая" for the line's wording. */
export const POPULATION_LABEL = `${(POPULATION.count / 1e6).toFixed(2)} сая`;

/** "👤 3.43 сая хүнд хуваавал ≈ 14,200₮ / хүн", or null. */
export function perPersonLine(amounts: string[]): string | null {
  const share = perPersonShare(amounts);
  return share === null ? null : `👤 ${POPULATION_LABEL} хүнд хуваавал ${formatShare(share)} / хүн`;
}
