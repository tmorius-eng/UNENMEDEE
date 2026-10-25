/**
 * "ОРОЙН ТОЙМ · 21:40": the part of the day and the Ulaanbaatar time an edition was written, so a
 * late or missed run never shows a wrong "morning". Used by the home strip and the Facebook post.
 */
export function editionLabel(d: { kind: string; periodEnd: Date | string }): string {
  if (d.kind === "30d") return "САРЫН ТОЙМ";
  const ub = new Date(new Date(d.periodEnd).getTime() + 8 * 3_600_000);
  const h = ub.getUTCHours();
  const part = h < 5 ? "ШӨНИЙН" : h < 11 ? "ӨГЛӨӨНИЙ" : h < 17 ? "ӨДРИЙН" : "ОРОЙН";
  return `${part} ТОЙМ · ${String(h).padStart(2, "0")}:${String(ub.getUTCMinutes()).padStart(2, "0")}`;
}
