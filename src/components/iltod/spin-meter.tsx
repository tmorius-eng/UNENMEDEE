import { cx } from "@/utils/cx";

/**
 * "PR Spin vs Fact" meter: neutrality_score (0-100) split into a fact bar and a spin bar.
 */
export function SpinMeter({ neutrality, size = "sm", className }: { neutrality: number | null; size?: "sm" | "md"; className?: string }) {
  if (neutrality === null) return null;
  const fact = Math.max(0, Math.min(100, neutrality));
  const spin = 100 - fact;
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-success-primary">Баримт {fact}%</span>
        <span className="text-warning-primary">Пи-ар {spin}%</span>
      </div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={fact}
        aria-label={`Баримтын түвшин ${fact}%, пи-ар ${spin}%`}
        className={cx("flex w-full gap-0.5 overflow-hidden rounded-full bg-quaternary", size === "md" ? "h-2.5" : "h-1.5")}
      >
        <div className="rounded-full bg-success-solid transition-all duration-700" style={{ width: `${fact}%` }} />
        <div className="rounded-full bg-warning-solid transition-all duration-700" style={{ width: `${spin}%` }} />
      </div>
    </div>
  );
}
