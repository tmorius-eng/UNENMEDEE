"use client";

import { Star01 } from "@untitledui/icons";

import { useLocalStorage } from "@/lib/local-store";
import { parseTopicFollows, TOPIC_FOLLOW_KEY, toggleTopicFollow } from "@/lib/topic-follow";
import { cx } from "@/utils/cx";

/** ⭐ follow a topic for "Миний мэдээ" (/my). Fixed width, so the label change never shifts the layout. */
export function FollowTopicButton({ topic, label, className }: { topic: string; label?: string; className?: string }) {
  const [raw, setRaw] = useLocalStorage(TOPIC_FOLLOW_KEY, "[]");
  const follows = parseTopicFollows(raw);
  const on = follows.includes(topic);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setRaw(JSON.stringify(toggleTopicFollow(follows, topic)))}
      className={cx(
        "flex min-w-32 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition ring-inset",
        on ? "bg-warning-primary text-warning-primary ring-warning-subtle" : "text-secondary ring-primary hover:bg-primary_hover",
        className,
      )}
    >
      <Star01 aria-hidden className={cx("size-4", on && "fill-current")} />
      {label ? `${label}${on ? " ✓" : ""}` : on ? "Дагаж байна" : "Дагах"}
    </button>
  );
}
