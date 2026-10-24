import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { CATEGORY_LABEL, RISK_LABEL, riskLevel } from "@/lib/format";
import type { SourceCategory } from "@/lib/types";

const CATEGORY_COLOR = { portal: "brand", ministry: "indigo", agency: "blue", local: "success" } as const;

/** ".gov.mn" source badge. */
export function SourceBadge({ domain, category, size = "sm" }: { domain: string; category: SourceCategory; size?: "sm" | "md" }) {
  return (
    <BadgeWithDot type="pill-color" color={CATEGORY_COLOR[category]} size={size}>
      <span className="max-w-[16ch] truncate">{domain}</span>
      <span className="sr-only"> ({CATEGORY_LABEL[category]})</span>
    </BadgeWithDot>
  );
}

export function RiskBadge({ score, size = "sm" }: { score: number; size?: "sm" | "md" | "lg" }) {
  const level = riskLevel(score);
  const color = level === "high" ? "error" : level === "medium" ? "warning" : "success";
  return (
    <Badge type="pill-color" color={color} size={size}>
      {level === "high" ? "🚨 " : ""}
      {RISK_LABEL[level]} · {score}
    </Badge>
  );
}

export function MoneyTags({ amounts, max = 3 }: { amounts: string[]; max?: number }) {
  if (amounts.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {amounts.slice(0, max).map((a) => (
        <Badge key={a} type="color" color="warning" size="sm">
          {a}
        </Badge>
      ))}
      {amounts.length > max && (
        <Badge type="color" color="gray" size="sm">
          +{amounts.length - max}
        </Badge>
      )}
    </div>
  );
}

export function DeepBadge() {
  return (
    <Badge type="pill-color" color="purple" size="sm">
      ⚡ Гүнзгий шинжилгээ
    </Badge>
  );
}
