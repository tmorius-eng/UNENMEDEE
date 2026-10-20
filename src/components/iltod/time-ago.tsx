"use client";

import { useEffect, useState } from "react";

import { formatDateMn, timeAgoMn } from "@/lib/format";

/** Absolute date on the server (cacheable), relative time once hydrated. */
export function TimeAgo({ date, className }: { date: Date | string | null; className?: string }) {
  const [label, setLabel] = useState(() => formatDateMn(date));
  useEffect(() => {
    const update = () => setLabel(timeAgoMn(date));
    update();
    const t = setInterval(update, 60_000);
    return () => clearInterval(t);
  }, [date]);
  const iso = date ? new Date(date).toISOString() : undefined;
  return (
    <time dateTime={iso} title={formatDateMn(date)} className={className} suppressHydrationWarning>
      {label}
    </time>
  );
}
