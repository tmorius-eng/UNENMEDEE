/**
 * Minimal JSON-stat 2.0 reader (the format of the NSO PX-Web API at data.1212.mn):
 * turns the flat value array into rows keyed by each dimension's category label.
 */
export interface JsonStat2 {
  id: string[];
  size: number[];
  value: (number | null)[];
  dimension: Record<string, { category: { index: Record<string, number> | string[]; label?: Record<string, string> } }>;
  updated?: string;
  source?: string;
}

export interface StatRow {
  /** dimension id → category label (e.g. { "Он": "2025", "Үзүүлэлт": "Орлого" }) */
  keys: Record<string, string>;
  /** dimension id → category code */
  codes: Record<string, string>;
  value: number | null;
}

function categories(dim: JsonStat2["dimension"][string]): { code: string; label: string }[] {
  const idx = dim.category.index;
  const codes = Array.isArray(idx) ? idx : Object.entries(idx).sort((a, b) => a[1] - b[1]).map(([c]) => c);
  return codes.map((code) => ({ code, label: dim.category.label?.[code] ?? code }));
}

export function readJsonStat(ds: JsonStat2): StatRow[] {
  const dims = ds.id.map((id) => ({ id, cats: categories(ds.dimension[id]) }));
  const rows: StatRow[] = [];
  ds.value.forEach((value, flat) => {
    let rest = flat;
    const keys: Record<string, string> = {};
    const codes: Record<string, string> = {};
    for (let d = dims.length - 1; d >= 0; d--) {
      const size = ds.size[d];
      const i = rest % size;
      rest = Math.floor(rest / size);
      keys[dims[d].id] = dims[d].cats[i].label;
      codes[dims[d].id] = dims[d].cats[i].code;
    }
    rows.push({ keys, codes, value });
  });
  return rows;
}
