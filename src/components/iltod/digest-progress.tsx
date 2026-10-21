"use client";

import { Check } from "@untitledui/icons";
import Link from "next/link";
import { useSyncExternalStore } from "react";

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

function useDigestRead(ids: number[]) {
  const [raw, setRaw] = useLocalStorage(READ_KEY, "[]");
  const [streakRaw, setStreak] = useLocalStorage(STREAK_KEY, "");
  const read = parseIds(raw);
  const markRead = (more: number[]) => {
    const next = addIds(raw, more);
    setRaw(next);
    const done = parseIds(next);
    if (ids.every((id) => done.has(id))) setStreak(JSON.stringify(bumpStreak(parseStreak(streakRaw), ubDay(Date.now()))));
  };
  return { read, markRead, streakRaw };
}

export function DigestProgress({ ids }: { ids: number[] }) {
  const { read, markRead, streakRaw } = useDigestRead(ids);
  const today = useToday();
  const count = ids.filter((id) => read.has(id)).length;
  const streak = today ? currentStreak(parseStreak(streakRaw), today) : 0;
  const done = count === ids.length;
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-secondary p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className={cx("font-semibold", done ? "text-success-primary" : "text-primary")}>
          {done ? "✓ Энэ тоймыг уншиж дууслаа" : `${count}/${ids.length} уншсан`}
        </span>
        {streak > 0 && <span className="font-semibold text-warning-primary">🔥 {streak} өдөр дараалан</span>}
      </div>
      <div className="h-2 rounded-full bg-primary" role="progressbar" aria-valuemin={0} aria-valuemax={ids.length} aria-valuenow={count} aria-label="Уншсан мэдээ">
        <div className="h-2 rounded-full bg-brand-solid transition-all" style={{ width: `${(count / Math.max(1, ids.length)) * 100}%` }} />
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
    <span aria-hidden className={cx("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold", read ? "bg-success-solid text-white" : "bg-brand-solid text-primary_on-brand")}>
      {read ? <Check className="size-3.5" /> : n}
    </span>
  );
}

export function TrackedLink({ id, ids, href, children }: { id: number; ids: number[]; href: string; children: React.ReactNode }) {
  const { read, markRead } = useDigestRead(ids);
  return (
    <Link href={href} onClick={() => markRead([id])} className={cx("font-semibold hover:text-brand-secondary hover:underline", read.has(id) ? "text-tertiary" : "text-primary")}>
      {children}
    </Link>
  );
}
