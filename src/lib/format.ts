/** Mongolian formatting helpers (pure, usable on server and client). */

const MN_MONTHS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

/** "2026 оны 10-р сарын 20" */
export function formatDateMn(date: Date | string | null | undefined): string {
  if (!date) return "Огноо тодорхойгүй";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "Огноо тодорхойгүй";
  const ub = new Date(d.getTime() + 8 * 3_600_000); // Asia/Ulaanbaatar (UTC+8, no DST)
  return `${ub.getUTCFullYear()} оны ${MN_MONTHS[ub.getUTCMonth()]}-р сарын ${ub.getUTCDate()}`;
}

/** "5 минутын өмнө", "3 цагийн өмнө", "2 өдрийн өмнө" */
export function timeAgoMn(date: Date | string | null | undefined, now: number = Date.now()): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Math.max(0, now - d.getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Дөнгөж сая";
  if (min < 60) return `${min} минутын өмнө`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} цагийн өмнө`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days} өдрийн өмнө`;
  return formatDateMn(d);
}

export function formatUsd(value: number, digits = 2): string {
  if (value > 0 && value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString("en-US").replace(/,/g, " ");
}

/** Splits a TL;DR (newline or sentence separated) into bullet sentences. */
export function tldrSentences(tldr: string, max = 3): string[] {
  const byLine = tldr.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const parts = byLine.length >= 2 ? byLine : tldr.split(/(?<=[.!?])\s+(?=[А-ЯӨҮЁA-Z0-9"“«])/u).map((s) => s.trim()).filter(Boolean);
  return parts.slice(0, max);
}

export type RiskLevel = "low" | "medium" | "high";

export function riskLevel(score: number): RiskLevel {
  if (score >= 65) return "high";
  if (score >= 35) return "medium";
  return "low";
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  low: "Бага эрсдэл",
  medium: "Анхаарах",
  high: "Өндөр эрсдэл",
};

export const CATEGORY_LABEL: Record<string, string> = {
  portal: "Портал",
  ministry: "Яам",
  agency: "Агентлаг",
  local: "Орон нутаг",
};
