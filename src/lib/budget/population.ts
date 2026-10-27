import { politeFetch } from "@/lib/scraper/http";

import { readJsonStat, type JsonStat2 } from "./jsonstat";

/**
 * Mongolia's resident population at the end of each year (NSO table DT_NSO_0300_001V2, both
 * sexes, all ages). `POPULATION` in src/lib/per-person.ts stays the one figure the site divides
 * by (a client component uses it too); this snapshot lets the watchdog name the exact new number
 * as soon as NSO publishes a newer year.
 */
export const POPULATION_TABLE = "https://data.1212.mn/api/v1/mn/NSO/Population,%20household/1_Population,%20household/DT_NSO_0300_001V2.px";

export interface PopulationSnapshot {
  year: number;
  count: number;
}

export function latestPopulation(ds: JsonStat2): PopulationSnapshot | null {
  let best: PopulationSnapshot | null = null;
  for (const r of readJsonStat(ds)) {
    const year = Number(r.keys["Он"]);
    const totalSex = r.keys["Хүйс"] === "Нийт дүн";
    const totalAge = r.keys["Нас"] === "Нийт дүн";
    if (!totalSex || !totalAge || !Number.isFinite(year) || r.value === null || r.value < 1_000_000) continue;
    if (!best || year > best.year) best = { year, count: Math.round(r.value) };
  }
  return best;
}

export async function fetchPopulation(): Promise<PopulationSnapshot> {
  const res = await politeFetch(POPULATION_TABLE, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    // Both sexes, all ages, every year: a few dozen numbers.
    body: JSON.stringify({
      query: [
        { code: "Хүйс", selection: { filter: "item", values: ["0"] } },
        { code: "Нас", selection: { filter: "item", values: ["0"] } },
      ],
      response: { format: "json-stat2" },
    }),
  });
  if (!res.ok) throw new Error(`data.1212.mn returned HTTP ${res.status} for DT_NSO_0300_001V2`);
  const latest = latestPopulation((await res.json()) as JsonStat2);
  if (!latest) throw new Error("DT_NSO_0300_001V2: no total population row");
  return latest;
}
