import { readJsonStat, type JsonStat2 } from "./jsonstat";

/**
 * Prices of everyday goods (/prices): NSO's monthly average prices of selected goods by region
 * (table DT_NSO_0600_019V1, since December 2010) and the average monthly nominal wage by region
 * (DT_NSO_0400_021V2, quarterly since 2000). Nominal ₮, as published; the page says so.
 *
 * PX-Web quirk: the `Сар` / `Улирал` codes are positional (code 0 = the newest month) and shift
 * every time NSO adds a month, so the query filters goods and regions by code and pulls the whole
 * time axis, and everything is keyed by the label text ("2026-09", "2026-2").
 */
const CPI = "https://data.1212.mn/api/v1/mn/NSO/Economy,%20environment/Consumer%20Price%20Index";
export const PRICES_TABLE = `${CPI}/DT_NSO_0600_019V1.px`;
export const PRICES_SOURCE_URL = "https://www.1212.mn/mn/statistic/statcate/573051/table-view/DT_NSO_0600_019V1";
export const WAGES_TABLE =
  "https://data.1212.mn/api/v1/mn/NSO/Labour,%20business/Wages/MONTHLY%20AVERAGE%20NOMINAL%20WAGES%2C%20by%20region%2C%20aimags%20and%20the%20Capital%2C%20by%20gender/DT_NSO_0400_021V2.px";
export const WAGES_SOURCE_URL = "https://www.1212.mn/mn/statistic/statcate/573051/table-view/DT_NSO_0400_021V2";

/** Улаанбаатар in both tables. */
export const UB_CODE = "511";
/**
 * The 21 aimags of the price table in NSO's order (west to east); Улаанбаатар is `UB_CODE`. The
 * region rows ("Баруун бүс", codes 1–5) are headings and hold no values.
 */
export const AIMAG_CODES = ["183", "182", "181", "185", "184", "265", "264", "263", "261", "262", "267", "342", "345", "344", "348", "346", "343", "341", "421", "422", "423"];
/** The wage table is in thousand ₮ ("мянган төгрөг" in its unit metadata). */
export const WAGE_UNIT = 1000;
/** The national total of the wage table. */
export const NATIONAL_CODE = "0";

export interface Good {
  /** NSO's category code (stable across months). */
  code: string;
  /** Our stable key: anchors, tests, the home line. */
  key: string;
  name: string;
  unit: string;
}

/** The goods shown, in page order. Names are ours (shorter than NSO's labels); units are NSO's. */
export const GOODS: Good[] = [
  { code: "5", key: "beef", name: "Үхрийн мах (ястай)", unit: "кг" },
  { code: "7", key: "mutton", name: "Хонины мах (ястай)", unit: "кг" },
  { code: "2", key: "flour", name: "Гурил, 1-р зэрэг", unit: "кг" },
  { code: "1", key: "bread", name: "Талх", unit: "ш" },
  { code: "0", key: "rice", name: "Цагаан будаа", unit: "кг" },
  { code: "11", key: "milk", name: "Сүү, задгай", unit: "л" },
  { code: "14", key: "egg", name: "Өндөг", unit: "ш" },
  { code: "25", key: "potato", name: "Төмс", unit: "кг" },
  { code: "26", key: "sugar", name: "Элсэн чихэр", unit: "кг" },
  { code: "37", key: "petrol", name: "Бензин А-92", unit: "л" },
  { code: "38", key: "diesel", name: "Дизель", unit: "л" },
  { code: "39", key: "canteen", name: "Гуанзны хоол", unit: "порц" },
  { code: "32", key: "firewood", name: "Түлшний мод", unit: "шуудай" },
];

/** A valid snapshot needs at least this many goods with a price in the latest month. */
export const MIN_GOODS = 10;

export function pricesQuery(goods = GOODS) {
  return {
    query: [
      { code: "Бараа, үйлчилгээ", selection: { filter: "item", values: goods.map((g) => g.code) } },
      { code: "Бүс", selection: { filter: "item", values: [UB_CODE, ...AIMAG_CODES] } },
    ],
    response: { format: "json-stat2" },
  };
}

export function wagesQuery() {
  return {
    query: [
      { code: "Хүйс", selection: { filter: "item", values: ["0"] } },
      { code: "Бүс", selection: { filter: "item", values: [NATIONAL_CODE, UB_CODE] } },
    ],
    response: { format: "json-stat2" },
  };
}

export interface GoodSeries extends Good {
  /** Улаанбаатар, aligned to `months` (null where NSO printed nothing). */
  ub: (number | null)[];
  /** The latest month in the capital and each aimag, by NSO code. */
  regions: Record<string, number | null>;
}

export interface PricesSnapshot {
  /** "2010-12" … "2026-09", oldest first: one axis for every good. */
  months: string[];
  latestMonth: string;
  goods: GoodSeries[];
  /** Улаанбаатар first, then the aimags in NSO's order. */
  regions: { code: string; name: string }[];
  /** NSO's own "updated" stamp. */
  updated: string | null;
}

export interface WagesSnapshot {
  /** "2000-4" … "2026-2", oldest first. */
  quarters: string[];
  national: (number | null)[];
  ub: (number | null)[];
  updated: string | null;
}

/** "2026-09" from whatever NSO prints for a month ("2026-09", "2026-9", "2026 09"); null otherwise. */
export function monthKey(label: string): string | null {
  const m = label.trim().match(/^(\d{4})\D+(\d{1,2})$/);
  if (!m) return null;
  const mm = Number(m[2]);
  return mm >= 1 && mm <= 12 ? `${m[1]}-${String(mm).padStart(2, "0")}` : null;
}

/** "2026-2" from a quarter label ("2026-2", "2026-II", "2026 оны 2-р улирал"); null otherwise. */
export function quarterKey(label: string): string | null {
  const s = label.trim();
  const roman: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };
  const m = s.match(/^(\d{4})[^\dA-Z]+(IV|III|II|I|[1-4])(?![IVX\d])/);
  if (!m) return null;
  const q = roman[m[2]] ?? Number(m[2]);
  return q >= 1 && q <= 4 ? `${m[1]}-${q}` : null;
}

function dimId(ds: JsonStat2, startsWith: string): string {
  const id = ds.id.find((d) => d.startsWith(startsWith));
  if (!id) throw new Error(`dimension "${startsWith}…" missing (have ${ds.id.join(", ")})`);
  return id;
}

function dimLabels(ds: JsonStat2, id: string): Map<string, string> {
  const dim = ds.dimension[id];
  return new Map(Object.keys(Array.isArray(dim.category.index) ? Object.fromEntries(dim.category.index.map((c) => [c, 0])) : dim.category.index).map((c) => [c, dim.category.label?.[c] ?? c]));
}

/** Turns the JSON-stat dataset into the snapshot; throws when the latest month is too thin, so the previous snapshot stays. */
export function parsePrices(ds: JsonStat2, goods = GOODS): PricesSnapshot {
  const region = dimId(ds, "Бүс");
  const good = dimId(ds, "Бараа");
  const month = dimId(ds, "Сар");
  const byKey = new Map<string, Good>(goods.map((g) => [g.code, g]));
  // good code → month key → region code → value
  const values = new Map<string, Map<string, Map<string, number | null>>>();
  const months = new Set<string>();
  for (const r of readJsonStat(ds)) {
    const g = r.codes[good];
    if (!byKey.has(g)) continue;
    const mk = monthKey(r.keys[month]);
    if (!mk) continue;
    months.add(mk);
    let perMonth = values.get(g);
    if (!perMonth) values.set(g, (perMonth = new Map()));
    let perRegion = perMonth.get(mk);
    if (!perRegion) perMonth.set(mk, (perRegion = new Map()));
    perRegion.set(r.codes[region], r.value);
  }
  const axis = [...months].sort();
  const latestMonth = axis.at(-1);
  if (!latestMonth) throw new Error("DT_NSO_0600_019V1: no months");
  const labels = dimLabels(ds, region);
  const regions = [UB_CODE, ...AIMAG_CODES].filter((c) => labels.has(c)).map((c) => ({ code: c, name: labels.get(c)!.trim() }));
  const out: GoodSeries[] = [];
  for (const g of goods) {
    const perMonth = values.get(g.code);
    if (!perMonth) continue;
    const ub = axis.map((m) => perMonth.get(m)?.get(UB_CODE) ?? null);
    const latest = perMonth.get(latestMonth);
    const regionValues = Object.fromEntries(regions.map((r) => [r.code, latest?.get(r.code) ?? null]));
    out.push({ ...g, ub, regions: regionValues });
  }
  const withLatest = out.filter((g) => g.ub.at(-1) !== null).length;
  if (withLatest < Math.min(MIN_GOODS, goods.length)) throw new Error(`DT_NSO_0600_019V1: only ${withLatest} goods have a price for ${latestMonth}`);
  return { months: axis, latestMonth, goods: out, regions, updated: ds.updated ?? null };
}

/** ₮ per wage value: the table is published in thousand ₮ unless its unit metadata says otherwise. */
export function wageScale(ds: JsonStat2): number {
  const contents = ds.dimension["ContentsCode"] as { category?: { unit?: Record<string, { base?: string }> } } | undefined;
  const base = Object.values(contents?.category?.unit ?? {})[0]?.base ?? "";
  return /мянга|thousand/i.test(base) || base === "" ? WAGE_UNIT : 1;
}

export function parseWages(ds: JsonStat2): WagesSnapshot {
  const region = dimId(ds, "Бүс");
  const quarter = dimId(ds, "Улирал");
  const scale = wageScale(ds);
  const national = new Map<string, number | null>();
  const ub = new Map<string, number | null>();
  for (const r of readJsonStat(ds)) {
    const qk = quarterKey(r.keys[quarter]);
    if (!qk) continue;
    const v = r.value === null ? null : Math.round(r.value * scale);
    if (r.codes[region] === NATIONAL_CODE) national.set(qk, v);
    else if (r.codes[region] === UB_CODE) ub.set(qk, v);
  }
  const quarters = [...new Set([...national.keys(), ...ub.keys()])].sort((a, b) => quarterOrder(a) - quarterOrder(b));
  if (quarters.length === 0 || national.get(quarters[quarters.length - 1]) === undefined) throw new Error("DT_NSO_0400_021V2: no national wage for the latest quarter");
  return { quarters, national: quarters.map((q) => national.get(q) ?? null), ub: quarters.map((q) => ub.get(q) ?? null), updated: ds.updated ?? null };
}

const quarterOrder = (q: string) => Number(q.slice(0, 4)) * 4 + Number(q.slice(5));

/** "2026-09" minus N years → "2016-09". */
export function monthsAgo(latest: string, years: number): string {
  return `${Number(latest.slice(0, 4)) - years}${latest.slice(4)}`;
}

export function valueAt(months: string[], series: (number | null)[], month: string): number | null {
  const i = months.indexOf(month);
  return i < 0 ? null : (series[i] ?? null);
}

export interface AgoPoint {
  years: number;
  month: string;
  value: number | null;
  /** Nominal change from then to now, in % (null when either side is missing). */
  pct: number | null;
}

export const AGO_YEARS = [1, 5, 10, 15];

/** The same month 1, 5, 10 and 15 years before the latest one, with the nominal % change to now. */
export function agoPoints(months: string[], series: (number | null)[], latest: string, years = AGO_YEARS): AgoPoint[] {
  const now = valueAt(months, series, latest);
  return years.map((y) => {
    const month = monthsAgo(latest, y);
    const value = valueAt(months, series, month);
    const pct = now !== null && value !== null && value !== 0 ? ((now - value) / value) * 100 : null;
    return { years: y, month, value, pct };
  });
}

/** One value per year (September, the month NSO's latest release usually sits in), plus the latest month when it is not a September. */
export function yearlySeries(months: string[], series: (number | null)[], month = "09"): { label: string; value: number | null }[] {
  const out: { label: string; value: number | null }[] = [];
  months.forEach((m, i) => {
    if (m.endsWith(`-${month}`)) out.push({ label: m.slice(0, 4), value: series[i] ?? null });
  });
  const last = months.at(-1);
  if (last && !last.endsWith(`-${month}`)) out.push({ label: last, value: series.at(-1) ?? null });
  return out;
}

/** Percentage change over the last 12 months of a series (the home line); null when a side is missing. */
export function yearlyPct(months: string[], series: (number | null)[]): number | null {
  const latest = months.at(-1);
  if (!latest) return null;
  return agoPoints(months, series, latest, [1])[0].pct;
}

export interface WagePoint {
  quarter: string;
  national: number | null;
  ub: number | null;
}

/** The newest quarter at or before the price month, and the same quarter about 5 and 10 years earlier. */
export function wagePairs(w: WagesSnapshot, latestMonth: string, yearsBack = [5, 10]): WagePoint[] {
  const year = Number(latestMonth.slice(0, 4));
  const q = Math.ceil(Number(latestMonth.slice(5)) / 3);
  const at = (y: number, qq: number): WagePoint | null => {
    let best = -1;
    w.quarters.forEach((label, i) => {
      if (quarterOrder(label) <= y * 4 + qq && w.national[i] !== null) best = i;
    });
    return best < 0 ? null : { quarter: w.quarters[best], national: w.national[best], ub: w.ub[best] };
  };
  const newest = at(year, q);
  if (!newest) return [];
  // The same quarter of the year 5 and 10 years back, so seasonal pay (bonuses) compares like with like.
  const newestYear = Number(newest.quarter.slice(0, 4));
  const newestQ = Number(newest.quarter.slice(5));
  const points = [newest, ...yearsBack.map((b) => at(newestYear - b, newestQ))].filter((p): p is WagePoint => p !== null);
  // Oldest first, no duplicates (a short wage series can give the same quarter twice).
  const seen = new Set<string>();
  return points.reverse().filter((p) => (seen.has(p.quarter) ? false : (seen.add(p.quarter), true)));
}

/** How many units of a good one monthly wage buys (whole units). */
export function perWage(wage: number | null, price: number | null): number | null {
  return wage === null || price === null || price <= 0 ? null : Math.floor(wage / price);
}

/** "2026 оны II улирал" for a quarter key. */
export function quarterLabel(q: string): string {
  const roman = ["I", "II", "III", "IV"][Number(q.slice(5)) - 1] ?? q.slice(5);
  return `${q.slice(0, 4)} оны ${roman} улирал`;
}

/** "2026 оны 9-р сар" for a month key. */
export function monthLabel(m: string): string {
  return `${m.slice(0, 4)} оны ${Number(m.slice(5))}-р сар`;
}
