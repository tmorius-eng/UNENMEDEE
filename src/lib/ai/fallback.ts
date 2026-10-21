/**
 * When no AI provider could process an article for a day (or its output was unusable), the
 * article would never appear: the site only lists articles that have a summary. The fallback
 * uses the article's own first sentences instead, labelled on the page as "AI ажиллаагүй".
 */
export const FALLBACK_AFTER_HOURS = 24;
/** Low but visible: above the feed's importance floor, below anything the AI rated as news. */
export const FALLBACK_IMPORTANCE = 30;

/** The first sentences of the text, at most `maxChars`, one per line (how tldr is stored). */
export function extractiveSummary(text: string, maxSentences = 2, maxChars = 320): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const sentences = clean.split(/(?<=[.!?])\s+(?=[А-ЯӨҮЁA-Z0-9"“«])/u).filter((s) => s.length > 15);
  const picked: string[] = [];
  for (const s of sentences.length ? sentences : [clean]) {
    if (picked.length >= maxSentences) break;
    const room = maxChars - picked.join(" ").length;
    if (room < 40) break;
    picked.push(s.length > room ? `${s.slice(0, room - 1).replace(/\s+\S*$/, "")}…` : s);
  }
  return picked.join("\n");
}
