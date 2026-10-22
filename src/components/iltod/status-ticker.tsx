"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { timeAgoMn } from "@/lib/format";
import { useLocalStorage } from "@/lib/local-store";
import { parseIds, READ_KEY } from "@/lib/read-state";
import { nextRunLabel } from "@/lib/ticker";
import { cx } from "@/utils/cx";

/** A shared minute clock. The server snapshot is 0, so prerendered HTML never shows a time. */
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
function useNow(): number {
  return useSyncExternalStore(
    subscribe,
    () => (now ||= Date.now()),
    () => 0,
  );
}

const ROTATE_MS = 4_000;

/**
 * Kagi-style status line under the date: the stats line (rendered on the server, so the first
 * paint is unchanged), then "updated … ago", "next check in …", today's count and the reader's
 * own read count, one every 4 s. Click or tap to advance; hover pauses.
 */
export function StatusTicker({ stats, lastArticleAt, todayArticles }: { stats: string; lastArticleAt: string | null; todayArticles: number }) {
  const time = useNow();
  const [raw] = useLocalStorage(READ_KEY, "[]");
  const read = parseIds(raw).size;
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);

  const messages = [stats];
  if (time) {
    if (lastArticleAt) messages.push(`Шинэчилсэн: ${timeAgoMn(lastArticleAt, time).toLowerCase()}`);
    messages.push(`Дараагийн шалгалт: ${nextRunLabel(time)} дараа`);
    if (todayArticles > 0) messages.push(`Өнөөдөр ${todayArticles} шинэ мэдээ`);
    if (read > 0) messages.push(`Та ${read} мэдээ уншсан`);
  }
  const current = messages[step % messages.length];

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setStep((s) => s + 1);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <button
      type="button"
      onClick={() => setStep((s) => s + 1)}
      // Mouse only: a tap fires enter without leave and would pause the line for good.
      onPointerEnter={(e) => e.pointerType === "mouse" && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setPaused(false)}
      aria-label={messages.join(". ")}
      className="mt-1 block h-5 w-full cursor-pointer overflow-hidden text-left text-sm text-tertiary"
    >
      <span
        key={step}
        aria-hidden
        // The first message is already on the page: animate only the ones that replace it.
        className={cx("block truncate", step > 0 && "animate-in duration-300 fade-in slide-in-from-bottom-1 motion-reduce:animate-none")}
      >
        {current}
      </span>
    </button>
  );
}
