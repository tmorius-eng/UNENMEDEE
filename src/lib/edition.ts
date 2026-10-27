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

/**
 * Said with every edition the AI editor did not write (`generated_by = 'rule-based'`): the
 * stories were ranked by rules, and the "👉" line is the article's own summary, not an editor's
 * note. The /digest page already labels it; posts and pushes must not look edited when they were not.
 */
export const RULE_BASED_NOTE = "ℹ️ Энэ удаад AI редактор ажиллаагүй: мэдээг дүрмээр эрэмбэлсэн.";

export function ruleBasedNote(d: { generatedBy?: string | null }): string | null {
  return d.generatedBy === "rule-based" ? RULE_BASED_NOTE : null;
}

/** Ulaanbaatar hours [from, to) when a scheduled 12h edition may be written (morning, evening). */
export const DIGEST_WINDOWS: [number, number][] = [
  [6, 11],
  [17, 23],
];

/**
 * "өглөө 06–11, орой 17–23 цагийн хооронд": when editions really appear. GitHub starts scheduled
 * jobs hours late, so the pipeline writes the edition inside these windows; a fixed "08:00" was false.
 */
export function digestWindowsLabel(windows: [number, number][] = DIGEST_WINDOWS): string {
  const part = (from: number) => (from < 12 ? "өглөө" : "орой");
  const hh = (h: number) => String(h).padStart(2, "0");
  return `${windows.map(([from, to]) => `${part(from)} ${hh(from)}–${hh(to)}`).join(", ")} цагийн хооронд`;
}
