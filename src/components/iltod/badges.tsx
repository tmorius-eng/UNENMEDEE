import { CATEGORY_LABEL, RISK_LABEL, riskLevel } from "@/lib/format";
import type { SourceCategory } from "@/lib/types";
import { cx } from "@/utils/cx";

/**
 * The ledger chips (CLAUDE.md §2): mono text in a hairline box. `mnt` is the one filled chip
 * (signal yellow for ₮ amounts), `risk` the red outline, `brand` the teal outline (sources, deep
 * analysis), `plain` everything else.
 */
export type ChipTone = "plain" | "mnt" | "risk" | "warn" | "brand";

const TONE: Record<ChipTone, string> = {
  plain: "text-secondary ring-line",
  mnt: "bg-signal font-bold text-signal-ink ring-transparent",
  risk: "bg-risk-soft text-risk ring-risk/50",
  warn: "bg-signal-soft text-primary ring-signal",
  brand: "text-brand-secondary ring-brand/40",
};

export function Chip({ tone = "plain", size = "sm", className, children }: { tone?: ChipTone; size?: "sm" | "md"; className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex max-w-full items-center gap-1 rounded-md font-mono tracking-[0.02em] whitespace-nowrap tabular-nums ring-1 ring-inset",
        size === "md" ? "px-2.5 py-1.5 text-xs" : "px-2 py-1 text-[11px] leading-4",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** ".gov.mn" source chip. */
export function SourceBadge({ domain, category, size = "sm" }: { domain: string; category: SourceCategory; size?: "sm" | "md" }) {
  return (
    <Chip tone="brand" size={size}>
      <span aria-hidden className="size-1.5 rounded-full bg-brand-solid" />
      <span className="max-w-[16ch] truncate">{domain}</span>
      <span className="sr-only"> ({CATEGORY_LABEL[category]})</span>
    </Chip>
  );
}

export function RiskBadge({ score, size = "sm" }: { score: number; size?: "sm" | "md" }) {
  const level = riskLevel(score);
  return (
    <Chip tone={level === "high" ? "risk" : level === "medium" ? "warn" : "brand"} size={size}>
      {level === "high" ? "⚠ " : ""}
      {RISK_LABEL[level]} · {score}
    </Chip>
  );
}

export function MoneyTags({ amounts, max = 3 }: { amounts: string[]; max?: number }) {
  if (amounts.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {amounts.slice(0, max).map((a) => (
        <Chip key={a} tone="mnt">
          {a}
        </Chip>
      ))}
      {amounts.length > max && <Chip>+{amounts.length - max}</Chip>}
    </div>
  );
}

export function DeepBadge() {
  return <Chip tone="brand">⚡ Гүнзгий шинжилгээ</Chip>;
}
