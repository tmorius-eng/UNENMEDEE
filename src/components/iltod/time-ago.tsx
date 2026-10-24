"use client";

import { formatDateMn, timeAgoMn } from "@/lib/format";
import { useNow } from "@/lib/now-store";

/**
 * Absolute date on the server (cacheable), relative time once hydrated. Every label reads the one
 * shared clock (now-store.ts): 40 of them on the home page used to mean 40 effects, 40 intervals
 * and 40 separate re-renders right after hydration.
 */
export function TimeAgo({ date, className }: { date: Date | string | null; className?: string }) {
  const now = useNow();
  const iso = date ? new Date(date).toISOString() : undefined;
  return (
    <time dateTime={iso} title={formatDateMn(date)} className={className} suppressHydrationWarning>
      {now ? timeAgoMn(date, now) : formatDateMn(date)}
    </time>
  );
}
