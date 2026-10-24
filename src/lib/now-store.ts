"use client";

import { useSyncExternalStore } from "react";

/**
 * One shared clock for every relative time on the page (StoryList's 40 TimeAgo labels, the masthead
 * ticker). It ticks every 30 s while something listens. The server snapshot is 0, so prerendered
 * HTML never depends on the clock, and a component can show the absolute date until hydration.
 */
let now = 0;
const subscribers = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(cb: () => void) {
  subscribers.add(cb);
  timer ??= setInterval(() => {
    now = Date.now();
    subscribers.forEach((f) => f());
  }, 30_000);
  return () => {
    subscribers.delete(cb);
    if (!subscribers.size && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

/** Milliseconds since the epoch, 0 on the server and during hydration. */
export function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => (now ||= Date.now()),
    () => 0,
  );
}
