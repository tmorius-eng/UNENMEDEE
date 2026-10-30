/**
 * When things happen in a video. The narration is one natural take (tts.ts), so there are no
 * per-sentence files: each sentence's start is estimated from its share of the letters and moved
 * to the nearest pause ffmpeg's silencedetect found (within `SNAP_S`). After the quiz question a
 * silence is inserted for the 3-2-1 guess (`PAUSE_S`), and the sound effects are placed on the same
 * clock as the picture, so both always agree.
 */
import type { Scene } from "./price-video";

export interface Silence {
  start: number;
  end: number;
}

export const SNAP_S = 1.2;
/** Seconds of the 3-2-1 guess after the question. */
export const PAUSE_S = 2.1;
/** Seconds the last frame stays after the voice ends. */
export const OUTRO_S = 0.8;
/** The relate scene's unit blocks appear one by one: first after this, then every BLOCK_STEP_S. */
export const BLOCKS_AFTER_S = 0.45;
export const BLOCK_STEP_S = 0.16;

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

/** Where speech starts and ends inside the take (leading and trailing silence cut off). */
export function speechBounds(silences: Silence[], total: number): { lead: number; tail: number } {
  return {
    lead: silences.find((s) => s.start <= 0.05)?.end ?? 0,
    tail: [...silences].reverse().find((s) => s.end >= total - 0.05)?.start ?? total,
  };
}

/**
 * Start time (seconds) of each sentence in the take. The first starts at 0 (its caption is on
 * screen from the first frame); the others at the sentence-end pause (`punctuationStarts`), else
 * at the end of the pause nearest to their share of the letters.
 */
export function sentenceStarts(sentences: string[], silences: Silence[], total: number): number[] {
  const { lead, tail } = speechBounds(silences, total);
  const speech = Math.max(0.1, tail - lead);
  const weights = sentences.map(letters);
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const pauses = silences.filter((s) => s.start > lead + 0.05 && s.end < tail - 0.05);
  const byPunctuation = punctuationStarts(sentences, pauses, (acc) => lead + (speech * acc) / sum);
  if (byPunctuation) return byPunctuation;
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

/** Spoken sentences ("За, ... тоо. Зуун ... төгрөг." is two) in one spec sentence. */
const spokenParts = (s: string) => Math.max(1, s.split(/(?<=[.!?…])\s+/).filter((p) => letters(p) > 0).length);

/**
 * A speaker pauses longest at the end of a sentence. With N full stops in the narration, the N
 * longest inner pauses are taken as those ends, in time order, and each spec sentence starts at
 * the one after its last spoken sentence. Letter shares alone drifted by a whole sentence when a
 * long number was said fast (Oct 2026). Returns null (use the letter estimate) when there are too
 * few pauses or a boundary lands more than 3 s from its letter estimate.
 */
function punctuationStarts(sentences: string[], pauses: Silence[], estimateAt: (letters: number) => number): number[] | null {
  const parts = sentences.map(spokenParts);
  const ends = parts.reduce((a, b) => a + b, 0) - 1;
  if (sentences.length < 2 || pauses.length < ends) return null;
  const chosen = [...pauses]
    .sort((a, b) => b.end - b.start - (a.end - a.start))
    .slice(0, ends)
    .sort((a, b) => a.start - b.start);
  const starts = [0];
  let part = 0;
  let acc = 0;
  for (let i = 1; i < sentences.length; i++) {
    part += parts[i - 1];
    acc += letters(sentences[i - 1]);
    const p = chosen[part - 1];
    if (!p || p.end <= starts[i - 1] + 0.3 || Math.abs((p.start + p.end) / 2 - estimateAt(acc)) > 3) return null;
    starts.push(Math.round(p.end * 100) / 100);
  }
  return starts;
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

export type Sfx = "tick" | "pop" | "whoosh" | "ding" | "block";

export interface Timeline {
  /** Sentence starts on the video clock (after the inserted pause). */
  starts: number[];
  /** Where the silence is inserted into the take (take clock = video clock before it). */
  pauseAt: number;
  pause: number;
  /** End of speech on the video clock. */
  speechEnd: number;
  total: number;
  sfx: { at: number; kind: Sfx }[];
}

/** The video clock: sentence starts shifted by the guess pause, the length, the sound effects. */
export function buildTimeline(scenes: Scene[], takeStarts: number[], take: { duration: number; tail: number }, units: number | null): Timeline {
  // The guess pause goes right before the answer: after sentence 0 in a price video, after the
  // hook and the question in a money video.
  const reveal = scenes.indexOf("reveal");
  const at = reveal > 0 ? reveal : 1;
  const pauseAt = Math.round(Math.max(0, takeStarts[at] - 0.05) * 100) / 100;
  const pause = scenes[at - 1] === "quiz" ? PAUSE_S : 0;
  const starts = takeStarts.map((t, i) => (i < at ? t : Math.round((t + pause) * 100) / 100));
  const total = Math.round((take.duration + pause + OUTRO_S) * 100) / 100;
  const sfx: Timeline["sfx"] = [];
  if (pause) for (let i = 0; i < 3; i++) sfx.push({ at: pauseAt + 0.15 + i * 0.7, kind: "tick" });
  scenes.forEach((scene, i) => {
    const at = starts[i];
    if (scene === "reveal") sfx.push({ at, kind: "pop" });
    else if (scene === "year") sfx.push({ at: Math.max(0, at - 0.1), kind: "ding" });
    else if (scene === "hook") sfx.push({ at: 0.35, kind: "ding" });
    else if (i > 0) sfx.push({ at: Math.max(0, at - 0.15), kind: "whoosh" });
    if (scene === "relate" && units) {
      const n = Math.min(12, Math.ceil(units));
      for (let b = 0; b < n; b++) sfx.push({ at: at + BLOCKS_AFTER_S + b * BLOCK_STEP_S, kind: "block" });
    }
  });
  return { starts, pauseAt, pause, speechEnd: take.tail + pause, total, sfx };
}

/** A caption split into words; `*…*` spans are one highlighted word (a number with its unit). */
export function captionWords(caption: string): { text: string; hl: boolean; weight: number }[] {
  const out: { text: string; hl: boolean; weight: number }[] = [];
  for (const part of caption.split(/(\*[^*]+\*)/)) {
    if (!part) continue;
    if (part.startsWith("*") && part.endsWith("*")) {
      const text = part.slice(1, -1);
      out.push({ text, hl: true, weight: 4 + 3 * (text.match(/\d/g)?.length ?? 0) });
      continue;
    }
    for (const w of part.split(/ +/)) if (w) out.push({ text: w, hl: false, weight: Math.max(2, letters(w)) });
  }
  return out;
}
