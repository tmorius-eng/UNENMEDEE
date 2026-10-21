/**
 * Neutral "анхаарах өөрчлөлт" markers computed from the declarations themselves. They state
 * numbers, never conclusions: a jump can have a lawful reason (inheritance, sale, salary).
 */
export interface DeclarationLike {
  year: number;
  incomeOwn: number | null;
  incomeFamily: number | null;
  loans: number | null;
  totalAssets: number;
}

export interface Flag {
  year: number;
  kind: "asset_jump" | "loans_over_income" | "missing_year";
  text: string;
}

const ASSET_JUMP = 0.5;
const MIN_ASSETS_FOR_JUMP = 50_000_000; // ignore jumps on very small bases

const mnt = (n: number) => `${(n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 1 })} сая ₮`;

export function declarationFlags(rows: DeclarationLike[]): Flag[] {
  const sorted = [...rows].sort((a, b) => a.year - b.year);
  const flags: Flag[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur.year - prev.year > 1) {
      flags.push({ year: prev.year + 1, kind: "missing_year", text: `${prev.year + 1} оны мэдүүлэг нийтлэгдээгүй байна.` });
    }
    if (prev.totalAssets >= MIN_ASSETS_FOR_JUMP && cur.totalAssets > prev.totalAssets * (1 + ASSET_JUMP)) {
      const pct = Math.round((cur.totalAssets / prev.totalAssets - 1) * 100);
      flags.push({ year: cur.year, kind: "asset_jump", text: `Хөрөнгийн дүн ${prev.year}→${cur.year} онд ${pct}% өссөн (${mnt(prev.totalAssets)} → ${mnt(cur.totalAssets)}).` });
    }
  }
  for (const r of sorted) {
    const income = (r.incomeOwn ?? 0) + (r.incomeFamily ?? 0);
    if (r.loans && income > 0 && r.loans > income) {
      flags.push({ year: r.year, kind: "loans_over_income", text: `${r.year} онд зээлийн үлдэгдэл (${mnt(r.loans)}) жилийн орлогоос (${mnt(income)}) их.` });
    }
  }
  return flags.sort((a, b) => b.year - a.year);
}
