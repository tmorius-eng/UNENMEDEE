"use client";

import { Star01 } from "@untitledui/icons";

import { useLocalStorage } from "@/lib/local-store";
import { parsePlaceFollows, parseTopicFollows, PLACE_FOLLOW_KEY, TOPIC_FOLLOW_KEY, toggleTopicFollow } from "@/lib/topic-follow";
import { cx } from "@/utils/cx";

const KINDS = {
  topic: { storageKey: TOPIC_FOLLOW_KEY, parse: parseTopicFollows },
  place: { storageKey: PLACE_FOLLOW_KEY, parse: parsePlaceFollows },
};

/** ⭐ follow a topic or a place for "Миний мэдээ" (/my). Fixed width, so the label change never shifts the layout. */
function FollowButton({ kind, id, label, className }: { kind: keyof typeof KINDS; id: string; label?: string; className?: string }) {
  const { storageKey, parse } = KINDS[kind];
  const [raw, setRaw] = useLocalStorage(storageKey, "[]");
  const follows = parse(raw);
  const on = follows.includes(id);
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => setRaw(JSON.stringify(toggleTopicFollow(follows, id)))}
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

export function FollowTopicButton({ topic, label, className }: { topic: string; label?: string; className?: string }) {
  return <FollowButton kind="topic" id={topic} label={label} className={className} />;
}

export function FollowPlaceButton({ place, label, className }: { place: string; label?: string; className?: string }) {
  return <FollowButton kind="place" id={place} label={label} className={className} />;
}
