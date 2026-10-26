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
