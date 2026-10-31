/**
 * When a video may go out. GitHub starts scheduled runs late (the first evening price video went
 * out at 01:12 Ulaanbaatar, 5.5 h after its 19:41 slot), so the time is decided here, not by the
 * cron: a video is made only inside a slot, once per slot. The 30-minute pipeline and video.yml
 * both ask; whichever runs first in the slot makes it.
 */
export interface VideoSlot {
  /** Ulaanbaatar hours [from, to). */
  from: number;
  to: number;
  prefer: "money" | "prices";
}

/** Lunch and evening scrolling time, Ulaanbaatar. */
export const VIDEO_SLOTS: VideoSlot[] = [
  { from: 12, to: 16, prefer: "money" },
  { from: 19, to: 23, prefer: "prices" },
];

const UB_MS = 8 * 3_600_000;

/** The slot `now` falls in, if it has no video yet (the newest video was made before the slot began). */
export function dueSlot(now: Date, lastVideoAt: Date | null): VideoSlot | null {
  const ub = new Date(now.getTime() + UB_MS);
  const hour = ub.getUTCHours();
  const slot = VIDEO_SLOTS.find((s) => hour >= s.from && hour < s.to);
  if (!slot) return null;
  const start = Date.UTC(ub.getUTCFullYear(), ub.getUTCMonth(), ub.getUTCDate(), slot.from) - UB_MS;
  return !lastVideoAt || lastVideoAt.getTime() < start ? slot : null;
}
