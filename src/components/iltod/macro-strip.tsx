import { ArrowRight } from "@untitledui/icons";
import Link from "next/link";

import type { MacroSnapshot } from "@/lib/mongolbank/client";
import { getIndicator } from "@/lib/queries";
import { cx } from "@/utils/cx";

/** Bank of Mongolia's announced inflation target (shown on its homepage as 6% ± 2). */
const INFLATION_TARGET = "6% (±2)";

const num = (v: number, digits = 2) => v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function Card({ accent, children, className }: { accent: string; children: React.ReactNode; className?: string }) {
  return <div className={cx("flex min-w-0 flex-col rounded-2xl border-t-2 bg-primary p-4 shadow-xs ring-1 ring-secondary ring-inset", accent, className)}>{children}</div>;
}

/**
 * Policy rate, inflation and FX / gold / reserves, like mongolbank.mn's homepage. Server-only
 * markup (no client JS); renders nothing until `npm run macro:sync` has stored a snapshot.
 */
export async function MacroStrip({ compact = false }: { compact?: boolean }) {
  const snap = await getIndicator<MacroSnapshot>("mongolbank");
  if (!snap) return null;
  const { policyRate, inflation, fx, gold, reserves } = snap.data;
  const usd = fx?.rates.find((r) => r.code === "USD");

  return (
    <section aria-label="Монголбанкны үзүүлэлт" className="flex flex-col gap-2">
      <div className={cx("grid gap-3", compact ? "scrollbar-hide -mx-4 auto-cols-[78%] grid-flow-col overflow-x-auto px-4 sm:mx-0 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-3 sm:px-0" : "sm:grid-cols-3")}>
        {policyRate && (
          <Card accent="border-utility-green-600">
            <p className="text-sm font-semibold text-primary">Бодлогын хүү</p>
            <p className="text-xs text-tertiary">Шинэчлэгдсэн: {policyRate.since}</p>
            <p className="mt-2 text-display-xs font-semibold text-primary tabular-nums">{num(policyRate.value, 1)}%</p>
          </Card>
        )}
        {inflation && (
          <Card accent="border-brand-600">
            <p className="text-sm font-semibold text-primary">Инфляц ({inflation.month} сар)</p>
            <p className="text-xs text-tertiary">Зорилтот түвшин: {INFLATION_TARGET}</p>
            <div className="mt-2 grid grid-cols-3 gap-1 text-center">
              {[
                { label: compact ? "УБ" : "Улаанбаатар", v: inflation.ub },
                { label: "Суурь", v: inflation.core },
                { label: "Улс", v: inflation.national },
              ].map((x) => (
                <div key={x.label}>
                  <p className={cx("font-semibold text-primary tabular-nums", compact ? "text-md" : "text-lg")}>{x.v === null ? "—" : `${num(x.v, 1)}%`}</p>
                  <p className="truncate text-[11px] leading-tight text-tertiary">{x.label}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
        <Card accent="border-utility-yellow-500">
          <dl className="flex flex-col divide-y divide-secondary text-sm">
            {[
              usd && fx && { label: "1 USD", value: num(usd.rate), when: fx.date },
              gold && { label: "Алт (авах, гр)", value: num(gold.buy), when: gold.date },
              reserves && { label: "ГВУН (сая $)", value: num(reserves.value), when: `${reserves.month} сар` },
            ]
              .filter((r): r is { label: string; value: string; when: string } => Boolean(r))
              .map((r) => (
                <div key={r.label} className="flex items-center justify-between gap-3 py-1.5">
                  <dt className="min-w-0">
                    <span className="block whitespace-nowrap text-secondary">{r.label}</span>
                    <span className="block text-xs text-quaternary">{r.when}</span>
                  </dt>
                  <dd className="font-semibold whitespace-nowrap text-primary tabular-nums">{r.value}</dd>
                </div>
              ))}
          </dl>
        </Card>
      </div>
      <p className="flex items-center justify-between text-xs text-quaternary">
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
