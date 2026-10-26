import { ArrowRight } from "@untitledui/icons";
import Link from "next/link";

import type { MacroSnapshot } from "@/lib/mongolbank/client";
import { getIndicator } from "@/lib/queries";
import { cx } from "@/utils/cx";

/** Bank of Mongolia's announced inflation target (shown on its homepage as 6% ± 2). */
const INFLATION_TARGET = "6% (±2)";

const num = (v: number, digits = 2) => v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

interface Cell {
  label: string;
  value: string;
  unit?: string;
  note: string;
  /** Up = brand, down = risk (inflation above the target). */
  tone?: "up" | "down";
}

/**
 * A ledger: a hairline grid of mono numbers, 2 columns on phones and 4 where the container is
 * wide enough (@container, so the same markup serves the home column and /data).
 */
export function Ledger({ cells, className }: { cells: Cell[]; className?: string }) {
  return (
    <dl className={cx("@container", className)}>
      <div className="grid grid-cols-2 border-b border-line @2xl:grid-cols-4">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={cx(
              "flex min-w-0 flex-col border-t border-line-soft py-3",
              i % 2 === 0 ? "border-r pr-3" : "pl-3",
              "@2xl:border-r @2xl:px-3.5 @2xl:first:pl-0 @2xl:last:border-r-0 @2xl:[&:nth-child(4n)]:border-r-0",
            )}
          >
            <dt className="label-mono truncate text-tertiary">{c.label}</dt>
            <dd className={cx("num-mono mt-1 text-xl", c.tone === "down" ? "text-risk" : c.tone === "up" ? "text-brand-secondary" : "text-primary")}>
              {c.value}
              {c.unit && <span className="ml-1 text-xs font-medium text-tertiary">{c.unit}</span>}
            </dd>
            <dd className="mt-0.5 truncate text-xs text-tertiary">{c.note}</dd>
          </div>
        ))}
      </div>
    </dl>
  );
}

/**
 * Policy rate, inflation and FX / gold / reserves, like mongolbank.mn's homepage. Server-only
 * markup (no client JS); renders nothing until `npm run macro:sync` has stored a snapshot.
 * The compact strip (home page) shows four numbers; /data shows all of them.
 */
export async function MacroStrip({ compact = false }: { compact?: boolean }) {
  const snap = await getIndicator<MacroSnapshot>("mongolbank");
  if (!snap) return null;
  const { policyRate, inflation, fx, gold, reserves } = snap.data;
  const usd = fx?.rates.find((r) => r.code === "USD");
  const aboveTarget = (v: number | null) => (v !== null && v > 8 ? "down" : undefined);

  const cells: (Cell | false | null | undefined)[] = [
    policyRate && { label: "Бодлогын хүү", value: num(policyRate.value, 1), unit: "%", note: `Монголбанк · ${policyRate.since}` },
    inflation && { label: compact ? "Инфляц · УБ" : "Инфляц · Улаанбаатар", value: inflation.ub === null ? "—" : num(inflation.ub, 1), unit: "%", note: `Зорилт ${INFLATION_TARGET}`, tone: aboveTarget(inflation.ub) },
    !compact && inflation && { label: "Инфляц · суурь", value: inflation.core === null ? "—" : num(inflation.core, 1), unit: "%", note: `${inflation.month} сар` },
    !compact && inflation && { label: "Инфляц · улс", value: inflation.national === null ? "—" : num(inflation.national, 1), unit: "%", note: `${inflation.month} сар`, tone: aboveTarget(inflation.national) },
    usd && fx && { label: "1 USD", value: num(usd.rate), unit: "₮", note: fx.date },
    !compact && gold && { label: "Алт (авах, гр)", value: num(gold.buy, 0), unit: "₮", note: gold.date },
    reserves && { label: "ГВУН", value: num(reserves.value, 0), unit: "сая $", note: `${reserves.month} сар` },
  ];

  return (
    <section aria-label="Монголбанкны үзүүлэлт" className="flex flex-col gap-2">
      <Ledger cells={cells.filter((c): c is Cell => Boolean(c))} />
      <p className="flex items-center justify-between text-xs text-tertiary">
        <span>Эх сурвалж: Монголбанк (mongolbank.mn)</span>
        {compact && (
          // No prefetch: /data pulls the chart library, which would load on every home visit.
          <Link href="/data" prefetch={false} className="flex items-center gap-1 font-semibold text-brand-secondary hover:underline">
            Дэлгэрэнгүй <ArrowRight className="size-3.5" />
          </Link>
        )}
      </p>
    </section>
  );
}
