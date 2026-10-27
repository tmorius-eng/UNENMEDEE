import { termOf } from "@/lib/officials/terms";
import type { DatasetHighlight, SeriesPoint } from "@/lib/types";

/**
 * Turns full opendata.mn datasets into small summaries for the /data page.
 * Pure functions over the rows the API returns; nothing here touches the network or DB.
 *
 * Column names on opendata.mn carry suffixes ("Rate (37)") and stray spaces, so values
 * are read by column-name prefix.
 */

export type Row = Record<string, unknown>;

function col(row: Row, prefix: string): unknown {
  if (prefix in row) return row[prefix];
  const key = Object.keys(row).find((k) => k.trim().startsWith(prefix));
  return key === undefined ? undefined : row[key];
}

function str(row: Row, prefix: string): string {
  const v = col(row, prefix);
  return v === null || v === undefined ? "" : String(v).replace(/ /g, " ").trim();
}

function num(row: Row, prefix: string): number | null {
  const v = col(row, prefix);
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[\s,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits;

/* ---------------------------------------------------------------- Mongolbank FX */

const FX_CODES = ["USD", "CNY", "EUR", "RUB", "KRW", "JPY", "GBP"];

export function fxHighlight(rows: Row[]): DatasetHighlight | null {
  const byDate = new Map<string, Map<string, { name: string; rate: number }>>();
  for (const r of rows) {
    const date = str(r, "date").slice(0, 10);
    const code = str(r, "EN");
    const rate = num(r, "Rate");
    if (!date || !code || rate === null) continue;
    if (!byDate.has(date)) byDate.set(date, new Map());
    byDate.get(date)!.set(code, { name: str(r, "MN"), rate });
  }
  const dates = [...byDate.keys()].sort();
  if (dates.length === 0) return null;
  const asOf = dates[dates.length - 1];
  const monthAgo = new Date(new Date(`${asOf}T00:00:00Z`).getTime() - 30 * 86_400_000).toISOString().slice(0, 10);
  const before = [...dates].reverse().find((d) => d <= monthAgo);
  const latest = byDate.get(asOf)!;
  const rates = FX_CODES.flatMap((code) => {
    const now = latest.get(code);
    if (!now) return [];
    const then = before ? byDate.get(before)?.get(code) : undefined;
    return [{ code, name: now.name, rate: now.rate, changePct: then ? round(((now.rate - then.rate) / then.rate) * 100) : null }];
  });
  const usdSeries = dates
    .slice(-180)
    .flatMap((d) => {
      const usd = byDate.get(d)?.get("USD");
      return usd ? [{ label: d, value: usd.rate }] : [];
    });
  return { kind: "fx", asOf, rates, usdSeries };
}

/* ---------------------------------------------------------------- macro indicators */

export function macroHighlight(rows: Row[]): DatasetHighlight | null {
  const groups = new Map<string, { unit: string; series: SeriesPoint[] }>();
  for (const r of rows) {
    const name = str(r, "Макро");
    const label = str(r, "Огноо");
    const value = num(r, "Утга");
    if (!name || !label || value === null) continue;
    if (!groups.has(name)) groups.set(name, { unit: str(r, "Хэмжих"), series: [] });
    groups.get(name)!.series.push({ label, value });
  }
  const indicators = [...groups.entries()].map(([name, g]) => {
    const series = g.series.sort((a, b) => a.label.localeCompare(b.label)).slice(-24);
    return { name, unit: g.unit, latest: series[series.length - 1], series };
  });
  return indicators.length ? { kind: "macro", indicators } : null;
}

/* ---------------------------------------------------------------- wages by sector */

const NATIONAL = "Улсын дундаж";

export function salaryHighlight(rows: Row[]): DatasetHighlight | null {
  const points = rows.flatMap((r) => {
    const sector = str(r, "Салбар");
    const quarter = str(r, "Улирал");
    const value = num(r, "Утга");
    return sector && quarter && value !== null ? [{ sector, quarter, value }] : [];
  });
  if (points.length === 0) return null;
  const quarters = [...new Set(points.map((p) => p.quarter))].sort();
  const latestQuarter = quarters[quarters.length - 1];
  const series = points.filter((p) => p.sector === NATIONAL).sort((a, b) => a.quarter.localeCompare(b.quarter)).map((p) => ({ label: p.quarter, value: p.value }));
  const latest = points.filter((p) => p.quarter === latestQuarter && p.sector !== NATIONAL).sort((a, b) => b.value - a.value);
  const toPoint = (p: (typeof latest)[number]) => ({ label: p.sector, value: p.value });
  return {
    kind: "salary",
    unit: "мянган ₮",
    latestQuarter,
    national: points.find((p) => p.quarter === latestQuarter && p.sector === NATIONAL)?.value ?? null,
    series: series.slice(-40),
    top: latest.slice(0, 5).map(toPoint),
    bottom: latest.slice(-5).reverse().map(toPoint),
  };
}

/* ---------------------------------------------------------------- procurement blacklist */

export function blacklistHighlight(rows: Row[], today = new Date()): DatasetHighlight | null {
  if (rows.length === 0) return null;
  const day = today.toISOString().slice(0, 10);
  const items = rows
    .map((r) => ({
      name: str(r, "Байгууллагын нэр"),
      registry: str(r, "Бүртгэлийн дугаар"),
      reason: str(r, "Шалтгаан"),
      note: str(r, "Тайлбар"),
      start: str(r, "Эхлэх огноо").slice(0, 10),
      end: str(r, "Дуусах огноо").slice(0, 10),
    }))
    .filter((i) => i.name);
  const active = items.filter((i) => !i.end || i.end >= day).sort((a, b) => b.start.localeCompare(a.start));
  return { kind: "blacklist", total: items.length, activeCount: active.length, items: active.slice(0, 200) };
}

/**
 * The blacklist as of `now`: the stored highlight was computed on its sync day, so a ban that has
 * ended since must not keep reading "одоо хүчинтэй" if the sync stops for a while.
 */
export function activeBlacklist<T extends DatasetHighlight>(h: T, now = new Date()): T {
  if (h.kind !== "blacklist") return h;
  const day = now.toISOString().slice(0, 10);
  const items = h.items.filter((i) => !i.end || i.end >= day);
  return { ...h, items, activeCount: Math.max(0, h.activeCount - (h.items.length - items.length)) };
}

/* ---------------------------------------------------------------- tenders */

export function tendersHighlight(rows: Row[]): DatasetHighlight | null {
  const tenders = rows.flatMap((r) => {
    const year = num(r, "Жил");
    if (year === null) return [];
    return [
      {
        year,
        budget: num(r, "Нийт төсөв") ?? 0,
        number: str(r, "Тендерийн дугаар"),
        name: str(r, "Тендерийн нэр"),
        status: str(r, "Төлөв") || "—",
        type: str(r, "Тендерийн төрлийн нэр"),
      },
    ];
  });
  if (tenders.length === 0) return null;
  const years = new Map<number, { count: number; budget: number }>();
  for (const t of tenders) {
    const y = years.get(t.year) ?? { count: 0, budget: 0 };
    y.count += 1;
    y.budget += t.budget;
    years.set(t.year, y);
  }
  const byYear = [...years.entries()].sort((a, b) => a[0] - b[0]).map(([year, y]) => ({ year, count: y.count, budget: Math.round(y.budget) }));
  const latestYear = byYear[byYear.length - 1].year;
  const current = tenders.filter((t) => t.year === latestYear);
  const statusCounts = new Map<string, number>();
  for (const t of current) statusCounts.set(t.status, (statusCounts.get(t.status) ?? 0) + 1);
  return {
    kind: "tenders",
    latestYear,
    byYear,
    statuses: [...statusCounts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
    largest: current
      .sort((a, b) => b.budget - a.budget)
      .slice(0, 15)
      .map(({ number, name, budget, status, type }) => ({ number, name, budget, status, type })),
  };
}

/* ---------------------------------------------------------------- parliament attendance */

/**
 * Counted per member AND parliamentary term (`termOf` the session date): the dataset names members
 * only by short name, so a new member who shares a former member's short name must not inherit
 * the former member's record, and a re-elected member gets one row per term.
 */
export function attendanceHighlight(rows: Row[]): DatasetHighlight | null {
  const members = new Map<string, { name: string; term: number; from: string; to: string; records: number; present: number; travel: number; medical: number; leave: number; unexplained: number }>();
  const sessions = new Set<string>();
  for (const r of rows) {
    const name = str(r, "Гишүүдийн нэр");
    const session = str(r, "Чуулганы огноо").slice(0, 10);
    const term = termOf(session);
    if (!name || !session || term === null) continue;
    sessions.add(session);
    const key = `${term}|${name}`;
    const m = members.get(key) ?? { name, term, from: session, to: session, records: 0, present: 0, travel: 0, medical: 0, leave: 0, unexplained: 0 };
    if (session < m.from) m.from = session;
    if (session > m.to) m.to = session;
    m.records += 1;
    const note = str(r, "Тайлбар").toLowerCase();
    if (str(r, "Ирсэн цаг")) m.present += 1;
    else if (note.includes("томилолт")) m.travel += 1;
    else if (note.includes("эмнэлг")) m.medical += 1;
    else if (note.includes("чөлөө")) m.leave += 1;
    else m.unexplained += 1;
    members.set(key, m);
  }
  if (members.size === 0) return null;
  const sorted = [...sessions].sort();
  const top = [...members.values()]
    // Every member (about 127, ~13 KB): /officials/[id] shows each MP's own row; /data shows the top 20.
    .sort((a, b) => b.unexplained - a.unexplained || a.present / a.records - b.present / b.records);
  return { kind: "attendance", sessions: sessions.size, from: sorted[0], to: sorted[sorted.length - 1], members: new Set(top.map((m) => m.name)).size, records: rows.length, top };
}

/** opendata.mn dataset ids with a dedicated summary. Every other dataset is listed in the catalogue. */
export const HIGHLIGHTS: Record<number, (rows: Row[]) => DatasetHighlight | null> = {
  262: fxHighlight,
  238: macroHighlight,
  246: salaryHighlight,
  168: (rows) => blacklistHighlight(rows),
  193: tendersHighlight,
  226: attendanceHighlight,
};
