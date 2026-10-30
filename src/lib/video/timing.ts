/**
 * When each sentence starts in the narration, so captions and panels change with the voice. The
 * narration is one natural take (tts.ts), so there are no per-sentence files: the start of each
 * sentence is estimated from its share of the letters and moved to the nearest pause ffmpeg's
 * silencedetect found, within `SNAP_S`.
 */

export interface Silence {
  start: number;
  end: number;
}

export const SNAP_S = 1.2;

/** ffmpeg `silencedetect` stderr → pauses. A trailing silence_start without an end runs to `total`. */
export function parseSilences(log: string, total: number): Silence[] {
  const out: Silence[] = [];
  let open: number | null = null;
  for (const m of log.matchAll(/silence_(start|end): (-?[\d.]+)/g)) {
    const t = Math.max(0, Number(m[2]));
    if (m[1] === "start") open = t;
    else if (open !== null) {
      out.push({ start: open, end: t });
      open = null;
    }
  }
  if (open !== null) out.push({ start: open, end: total });
  return out;
}

const letters = (s: string) => s.replace(/[^\p{L}\p{N}]/gu, "").length;

/**
 * Start time (seconds) of each sentence. The first starts at 0 (its caption is on screen from
 * the first frame); the others at the end of the pause nearest to their estimated start.
 */
export function sentenceStarts(sentences: string[], silences: Silence[], total: number): number[] {
  const lead = silences.find((s) => s.start <= 0.05)?.end ?? 0;
  const tail = [...silences].reverse().find((s) => s.end >= total - 0.05)?.start ?? total;
  const speech = Math.max(0.1, tail - lead);
  const weights = sentences.map(letters);
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const pauses = silences.filter((s) => s.start > lead + 0.05 && s.end < tail - 0.05);
  const starts = [0];
  let acc = 0;
  for (let i = 1; i < sentences.length; i++) {
    acc += weights[i - 1];
    const estimate = lead + (speech * acc) / sum;
    const near = pauses
      .filter((p) => p.end > starts[i - 1] + 0.3)
      .map((p) => ({ p, d: Math.abs((p.start + p.end) / 2 - estimate) }))
      .sort((a, b) => a.d - b.d)[0];
    starts.push(near && near.d <= SNAP_S ? near.p.end : Math.max(estimate, starts[i - 1] + 0.3));
  }
  return starts.map((t) => Math.round(t * 100) / 100);
}

/**
 * The narration is plausible speech for this text: Mongolian at a natural pace says roughly 12–22
 * letters a second. Far outside that, the model read the director's note aloud, stopped early or
 * stretched: refuse the take instead of posting it.
 */
export function plausibleTake(text: string, speechSeconds: number): boolean {
  const rate = letters(text) / Math.max(0.1, speechSeconds);
  return rate >= 9 && rate <= 28;
}
