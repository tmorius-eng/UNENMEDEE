import Link from "next/link";

import { type PricesSnapshot, yearlyPct } from "@/lib/budget/prices";
import { formatNumber } from "@/lib/format";
import { getIndicator } from "@/lib/queries";

/** "▲ 50%" for a nominal change; one decimal under 10 %. */
export function pctLabel(pct: number | null): string | null {
  if (pct === null || !Number.isFinite(pct)) return null;
  const abs = Math.abs(pct);
  const n = abs < 10 ? abs.toLocaleString("en-US", { maximumFractionDigits: 1 }) : String(Math.round(abs));
  return `${pct > 0 ? "▲" : pct < 0 ? "▼" : "="} ${n}%`;
}

const HOME_GOODS = ["beef", "petrol"];

/**
 * One server-rendered line under the home macro strip: the two prices people feel first and how
 * they moved in a year, linking to /prices. Nothing without a snapshot (no layout reserved: the
 * strip above it keeps its own height).
 */
export async function PricesLine() {
  const snap = await getIndicator<PricesSnapshot>("prices_nso").catch(() => null);
  if (!snap) return null;
  const parts = HOME_GOODS.map((key) => snap.data.goods.find((g) => g.key === key))
    .filter((g): g is NonNullable<typeof g> => g !== undefined && g.ub.at(-1) !== null)
    .map((g) => {
      const pct = pctLabel(yearlyPct(snap.data.months, g.ub));
      return `${g.name.replace(/ \(.*\)$/, "")} ${formatNumber(g.ub.at(-1) as number)} ₮/${g.unit}${pct ? ` (1 жилд ${pct})` : ""}`;
    });
  if (parts.length === 0) return null;
  return (
    <p className="flex flex-wrap items-baseline gap-x-2 border-b border-line py-2 text-xs text-secondary">
      <span aria-hidden>🛒</span>
      <span>{parts.join(" · ")}</span>
      <Link href="/prices" prefetch={false} className="font-semibold text-brand-secondary hover:underline">
        Үнэ 15 жилээр →
      </Link>
    </p>
  );
}
