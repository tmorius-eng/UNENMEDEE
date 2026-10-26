import { cx } from "@/utils/cx";

/**
 * "PR Spin vs Fact" meter: neutrality_score (0-100) as one split bar, brand (fact) and signal
 * (PR), with a mono legend. An AI estimate, labelled as such where it is shown.
 */
export function SpinMeter({ neutrality, size = "sm", className }: { neutrality: number | null; size?: "sm" | "md"; className?: string }) {
  if (neutrality === null) return null;
  const fact = Math.max(0, Math.min(100, neutrality));
  const spin = 100 - fact;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fact}
        aria-label={`Баримтын түвшин ${fact}%, пи-ар ${spin}%`}
        className={cx("flex w-full gap-0.5 overflow-hidden rounded-full bg-line-soft", size === "md" ? "h-2" : "h-1.5")}
      >
        <div className="rounded-full bg-brand-solid transition-all duration-700" style={{ width: `${fact}%` }} />
        <div className="rounded-full bg-signal transition-all duration-700" style={{ width: `${spin}%` }} />
      </div>
      <div className="label-mono flex items-center justify-between text-tertiary">
        <span className="text-brand-secondary">Баримт {fact}%</span>
        <span>Пи-ар {spin}%</span>
      </div>
    </div>
  );
}
