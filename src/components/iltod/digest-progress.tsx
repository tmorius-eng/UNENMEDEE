"use client";

import { Check } from "@untitledui/icons";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import { useLocalStorage } from "@/lib/local-store";
import { addIds, bumpStreak, currentStreak, parseIds, parseStreak, READ_KEY, STREAK_KEY, ubDay } from "@/lib/read-state";
import { cx } from "@/utils/cx";

/**
 * Daily habit for the newest digest: "3/10 уншсан", a ✓ per story read (shared with the home
 * StoryList) and a "🔥 N өдөр дараалан" streak when an edition is finished. Browser-only state.
 */
const noop = () => () => {};
/** Today's date is client-only (prerendered HTML must not depend on the clock). */
function useToday(): string {
  return useSyncExternalStore(noop, () => ubDay(Date.now()), () => "");
}

/** `edition` given = this caller records the streak (DigestProgress only; links just mark stories read). */
function useDigestRead(ids: number[], edition?: number) {
  const [raw, setRaw] = useLocalStorage(READ_KEY, "[]");
  const [streakRaw, setStreak] = useLocalStorage(STREAK_KEY, "");
  const read = parseIds(raw);
  const complete = ids.length > 0 && ids.every((id) => read.has(id));
  // The read list is shared with the home page: an edition finished there (or in another tab)
  // counts too. This writes localStorage, not React state, and only when the day is not recorded.
  useEffect(() => {
    if (!complete || edition === undefined) return;
    const today = ubDay(Date.now());
    const prev = parseStreak(streakRaw);
    if (prev?.d !== today && prev?.e !== edition) setStreak(JSON.stringify(bumpStreak(prev, today, edition)));
  }, [complete, streakRaw, setStreak, edition]);
  const markRead = (more: number[]) => setRaw(addIds(raw, more));
  return { read, markRead, streakRaw };
}

export function DigestProgress({ ids, edition }: { ids: number[]; edition: number }) {
  const { read, markRead, streakRaw } = useDigestRead(ids, edition);
  const today = useToday();
  const count = ids.filter((id) => read.has(id)).length;
  const streak = today ? currentStreak(parseStreak(streakRaw), today) : 0;
  const done = count === ids.length;
  return (
    <div className="flex flex-col gap-2 border-y border-line-soft py-3">
      <div className="label-mono flex flex-wrap items-center gap-3 text-tertiary">
        <span className={cx(done ? "text-brand-secondary" : "text-primary")}>{done ? "✓ Энэ тоймыг уншиж дууслаа" : `${count}/${ids.length} уншсан`}</span>
        <span className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-line-soft" role="progressbar" aria-valuemin={0} aria-valuemax={ids.length} aria-valuenow={count} aria-label="Уншсан мэдээ">
          <span className="block h-full rounded-full bg-brand-solid transition-all" style={{ width: `${(count / Math.max(1, ids.length)) * 100}%` }} />
        </span>
        {streak > 0 && <span className="text-primary">🔥 {streak} өдөр дараалан</span>}
      </div>
      {!done && (
        <button type="button" onClick={() => markRead(ids)} className="w-fit text-xs font-semibold text-tertiary hover:text-secondary">
          Бүгдийг уншсан болгох
        </button>
      )}
    </div>
  );
}

export function TrackedNumber({ id, n }: { id: number; n: number }) {
  const [raw] = useLocalStorage(READ_KEY, "[]");
  const read = parseIds(raw).has(id);
  return (
    <span aria-hidden className={cx("num-mono mt-0.5 w-7 shrink-0 text-lg leading-none", read ? "text-brand-secondary" : "text-tertiary")}>
      {read ? <Check className="size-4" strokeWidth={2.5} /> : String(n).padStart(2, "0")}
    </span>
  );
}

export function TrackedLink({ id, ids, href, children }: { id: number; ids: number[]; href: string; children: React.ReactNode }) {
  const { read, markRead } = useDigestRead(ids);
  return (
    <Link href={href} onClick={() => markRead([id])} className={cx("font-display text-md font-bold tracking-[-0.02em] hover:text-brand-secondary hover:underline", read.has(id) ? "text-tertiary" : "text-primary")}>
      {children}
    </Link>
  );
}
