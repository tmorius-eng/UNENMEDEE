/**
 * Sparklines for the ledger cells: a polyline over the last points of a series, as SVG path data
 * for a fixed `viewBox` (the element is stretched with preserveAspectRatio="none" and a
 * non-scaling stroke, so the markup is tiny and no client JS is involved).
 */
export const SPARK_W = 100;
export const SPARK_H = 22;
/** Points shown per cell (the newest). */
export const SPARK_POINTS = 30;

export interface SparkPath {
  /** `points` of the polyline. */
  line: string;
  /** `d` of the filled area under it. */
  area: string;
}

/** Null with fewer than two points. A flat series is a line through the middle. */
export function sparkPath(values: number[], w = SPARK_W, h = SPARK_H): SparkPath | null {
  const v = values.slice(-SPARK_POINTS).filter((n) => Number.isFinite(n));
  if (v.length < 2) return null;
  const min = Math.min(...v);
  const max = Math.max(...v);
  const range = max - min;
  const pad = 2;
  const pts = v.map((y, i) => {
    const x = (i / (v.length - 1)) * w;
    const yy = range === 0 ? h / 2 : h - pad - ((y - min) / range) * (h - 2 * pad);
    return `${x.toFixed(1)},${yy.toFixed(1)}`;
  });
  return { line: pts.join(" "), area: `M0,${h} L${pts.join(" L")} L${w},${h} Z` };
}

/**
 * "▲ 0.4" / "▼ 1.2" / "= 0": the change from the first shown point to the last, as an absolute
 * difference (`pct` false: percentage-point series like inflation) or as a percentage of the
 * first value (₮ and $ series).
 */
export function sparkDelta(values: number[], pct: boolean, digits = 1): string | null {
  const v = values.slice(-SPARK_POINTS).filter((n) => Number.isFinite(n));
  if (v.length < 2) return null;
  const first = v[0];
  const last = v[v.length - 1];
  const d = pct ? (first === 0 ? 0 : ((last - first) / Math.abs(first)) * 100) : last - first;
  const text = Math.abs(d).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  if (Number(text) === 0) return "= 0";
  return `${d > 0 ? "▲" : "▼"} ${text}${pct ? "%" : ""}`;
}

/**
 * A full-series line for the price pages (320×80 by default): every point is drawn on the full
 * time axis (a missing month leaves a gap in x, never compresses time), so 15 years of monthly
 * prices stay readable. Same rendering as the sparkline: stretched SVG, non-scaling stroke.
 */
export const LINE_W = 320;
export const LINE_H = 80;

export interface LinePath extends SparkPath {
  min: number;
  max: number;
}

export function linePath(values: (number | null)[], w = LINE_W, h = LINE_H, pad = 3): LinePath | null {
  const known = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (known.length < 2 || values.length < 2) return null;
  const min = Math.min(...known);
  const max = Math.max(...known);
  const range = max - min;
  const pts: string[] = [];
  values.forEach((y, i) => {
    if (y === null || !Number.isFinite(y)) return;
    const x = (i / (values.length - 1)) * w;
    const yy = range === 0 ? h / 2 : h - pad - ((y - min) / range) * (h - 2 * pad);
    pts.push(`${x.toFixed(1)},${yy.toFixed(1)}`);
  });
  const firstX = pts[0].split(",")[0];
  const lastX = pts[pts.length - 1].split(",")[0];
  return { line: pts.join(" "), area: `M${firstX},${h} L${pts.join(" L")} L${lastX},${h} Z`, min, max };
}

/**
 * Axis labels under a monthly line: the first year, every `every`-th year after it, and the last one;
 * `x` is 0..1. A regular tick within `EDGE` of either end is dropped (a four-digit label there would
 * overlap the first or the last one on a phone-wide axis: "20252026").
 */
const EDGE = 0.12;
export function yearTicks(months: string[], every = 5): { label: string; x: number }[] {
  if (months.length === 0) return [];
  const out: { label: string; x: number }[] = [];
  const firstYear = Number(months[0].slice(0, 4));
  months.forEach((m, i) => {
    const year = Number(m.slice(0, 4));
    if (m.endsWith("-01") && (year - firstYear) % every === 0 && year !== firstYear) out.push({ label: String(year), x: i / (months.length - 1) });
  });
  const last = { label: months[months.length - 1].slice(0, 4), x: 1 };
  if (!out.some((t) => t.label === last.label)) out.push(last);
  return [{ label: String(firstYear), x: 0 }, ...out.filter((t) => t.x > EDGE && t.x < 1 - EDGE), last].filter((t, i, a) => a.findIndex((u) => u.label === t.label) === i);
}
