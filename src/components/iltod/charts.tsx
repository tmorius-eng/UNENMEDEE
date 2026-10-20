"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";

import { formatUsd } from "@/lib/format";

const AXIS = { fontSize: 12, fill: "var(--color-text-tertiary)" };

function MoneyTooltip({ active, payload, label }: Partial<TooltipContentProps<number, string>>) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + Number(p.value ?? 0), 0);
  return (
    <div className="rounded-lg bg-primary px-3 py-2 text-xs shadow-lg ring-1 ring-secondary ring-inset">
      <p className="mb-1 font-semibold text-primary">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-secondary">
          <span className="size-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-primary tabular-nums">{formatUsd(Number(p.value ?? 0), 4)}</span>
        </p>
      ))}
      {payload.length > 1 && <p className="mt-1 border-t border-secondary pt-1 text-tertiary">Нийт: {formatUsd(total, 4)}</p>}
    </div>
  );
}

function LegendText(value: string) {
  return <span className="text-xs text-secondary">{value}</span>;
}

/** Stacked daily AI spend per provider (last 30 days). */
export function DailySpendChart({ data }: { data: { day: string; deepseek: number; grok: number; ollama: number }[] }) {
  const rows = data.map((d) => ({ ...d, label: d.day.slice(5) }));
  return (
    <div className="h-72 w-full" role="img" aria-label="Сүүлийн 30 хоногийн AI зардал, үйлчилгээ үзүүлэгчээр">
      <ResponsiveContainer>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%" maxBarSize={48}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="0" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatUsd(v, v < 1 ? 3 : 2)} />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--color-bg-secondary)" }} />
          <Legend formatter={LegendText} iconType="square" iconSize={10} />
          {/* 2px surface stroke = gap between stacked segments */}
          <Bar dataKey="deepseek" name="DeepSeek" stackId="a" fill="var(--series-1)" stroke="var(--chart-surface)" strokeWidth={2} />
          <Bar dataKey="grok" name="Grok" stackId="a" fill="var(--series-2)" stroke="var(--chart-surface)" strokeWidth={2} />
          <Bar dataKey="ollama" name="Ollama (0$)" stackId="a" fill="var(--series-3)" stroke="var(--chart-surface)" strokeWidth={2} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Monthly expenses vs income (one axis, both USD). */
export function LedgerChart({ data }: { data: { month: string; expenses: number; income: number }[] }) {
  return (
    <div className="h-72 w-full" role="img" aria-label="Сар бүрийн зардал ба орлого">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} maxBarSize={56}>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatUsd(v, 0)} />
          <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--color-bg-secondary)" }} />
          <Legend formatter={LegendText} iconType="square" iconSize={10} />
          <Bar dataKey="expenses" name="Зардал" fill="var(--series-1)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="income" name="Орлого (зар + хандив)" fill="var(--series-2)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
