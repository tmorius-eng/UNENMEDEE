/**
 * Neutral "анхаарах өөрчлөлт" markers computed from the declarations themselves. They state
 * numbers, never conclusions: a jump can have a lawful reason (inheritance, sale, salary), and a
 * filing can simply carry a unit error (the IAAC form takes thousand ₮; one line typed in ₮ makes
 * a year look 1000× richer). Such a year is named, kept as declared, and left out of comparisons.
 */
export interface DeclarationLike {
  year: number;
  incomeOwn: number | null;
  incomeFamily: number | null;
  loans: number | null;
  totalAssets: number | null;
}

export interface Flag {
  year: number;
  kind: "asset_jump" | "loans_over_income" | "missing_year" | "unit_suspect";
  text: string;
}

const ASSET_JUMP = 0.5;
const MIN_ASSETS_FOR_JUMP = 50_000_000; // ignore jumps on very small bases
/** A year this many times away from the person's other years is a suspected unit error. */
export const UNIT_GAP = 20;
/** Totals below this are too small to tell a unit error from a real change. */
const MIN_COMPARABLE = 10_000_000;
/** Percentages are shown up to this value ("500%+"): bigger ones are unit errors or tiny bases. */
export const PCT_CAP = 500;
/** Loans are only worth a marker when they exceed the year's income this many times. */
export const LOANS_OVER_INCOME = 3;

const mnt = (n: number) => `${(n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })} сая ₮`;

/** "73%" or "500%+" for a ratio such as 0.73; the sign is left to the caller. */
export function formatPercent(ratio: number): string {
  const pct = Math.round(Math.abs(ratio) * 100);
  return pct > PCT_CAP ? `${PCT_CAP}%+` : `${pct}%`;
}

/**
 * Years whose declared total is more than UNIT_GAP× away from the person's other years. With two
 * filings that far apart nobody can tell which one is off, so both are returned; with three or
 * more the outliers from the median are. Years without a total are never compared.
 */
export function suspectUnitYears(rows: { year: number; totalAssets: number | null }[]): number[] {
  const valued = rows.filter((r): r is { year: number; totalAssets: number } => r.totalAssets !== null && r.totalAssets >= MIN_COMPARABLE);
  if (valued.length < 2) return [];
  const totals = valued.map((r) => r.totalAssets).sort((a, b) => a - b);
  if (valued.length === 2) return totals[1] > totals[0] * UNIT_GAP ? valued.map((r) => r.year) : [];
  const median = totals[Math.floor(totals.length / 2)];
  return valued.filter((r) => r.totalAssets > median * UNIT_GAP || r.totalAssets < median / UNIT_GAP).map((r) => r.year);
}

export function declarationFlags(rows: DeclarationLike[]): Flag[] {
  const sorted = [...rows].sort((a, b) => a.year - b.year);
  const suspect = new Set(suspectUnitYears(sorted));
  const flags: Flag[] = [];
  if (suspect.size === 2 && sorted.filter((r) => r.totalAssets !== null).length === 2) {
    const [a, b] = [...suspect].sort();
    flags.push({
      year: b,
      kind: "unit_suspect",
      text: `${a} ба ${b} оны нийт дүн хоорондоо ${UNIT_GAP} дахинаас их зөрүүтэй: эх мэдүүлэгт нэгжийн (мянган ₮ / ₮) алдаа байж болзошгүй тул хувийн өөрчлөлтийг тооцоолоогүй. Эх мэдүүлгийг ХАСХОМ-оос шалгана уу.`,
    });
  } else {
    for (const y of suspect) {
      const total = sorted.find((r) => r.year === y)?.totalAssets ?? 0;
      flags.push({
        year: y,
        kind: "unit_suspect",
        text: `${y} оны нийт дүн (${mnt(total)}) бусад жилээс ${UNIT_GAP} дахинаас их зөрүүтэй: эх мэдүүлэгт нэгжийн (мянган ₮ / ₮) алдаа байж болзошгүй тул харьцуулалтад оруулаагүй. Эх мэдүүлгийг ХАСХОМ-оос шалгана уу.`,
      });
    }
  }
  const comparable = sorted.filter((r) => r.totalAssets !== null && !suspect.has(r.year));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].year - sorted[i - 1].year > 1) {
      flags.push({ year: sorted[i - 1].year + 1, kind: "missing_year", text: `${sorted[i - 1].year + 1} оны мэдүүлэг нийтлэгдээгүй байна.` });
    }
  }
  for (let i = 1; i < comparable.length; i++) {
    const prev = comparable[i - 1];
    const cur = comparable[i];
    const prevTotal = prev.totalAssets ?? 0;
    const curTotal = cur.totalAssets ?? 0;
    if (prevTotal >= MIN_ASSETS_FOR_JUMP && curTotal > prevTotal * (1 + ASSET_JUMP)) {
      flags.push({ year: cur.year, kind: "asset_jump", text: `Хөрөнгийн дүн ${prev.year}→${cur.year} онд ${formatPercent(curTotal / prevTotal - 1)} өссөн (${mnt(prevTotal)} → ${mnt(curTotal)}).` });
    }
  }
  for (const r of sorted) {
    const income = (r.incomeOwn ?? 0) + (r.incomeFamily ?? 0);
    if (r.loans && income > 0 && r.loans > income * LOANS_OVER_INCOME && !suspect.has(r.year)) {
      flags.push({ year: r.year, kind: "loans_over_income", text: `${r.year} онд зээлийн үлдэгдэл (${mnt(r.loans)}) жилийн орлогоос (${mnt(income)}) ${LOANS_OVER_INCOME} дахинаас их.` });
    }
  }
  return flags.sort((a, b) => b.year - a.year);
}

/** Short names ("Д.Цогтбаатар") that more than one of these people share: nothing can be matched by name alone. */
export function sharedShortNames(people: { shortName: string }[]): Set<string> {
  const seen = new Set<string>();
  const shared = new Set<string>();
  for (const p of people) (seen.has(p.shortName) ? shared : seen).add(p.shortName);
  return shared;
}
