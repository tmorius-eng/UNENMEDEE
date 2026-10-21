"use client";

import { ArrowUpRight, Check } from "@untitledui/icons";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { tldrSentences } from "@/lib/format";
import { useLocalStorage } from "@/lib/local-store";
import type { ArticleListItem } from "@/lib/queries";
import { storyTag } from "@/lib/topics";
import { cx } from "@/utils/cx";

import { AIMessage } from "./ai-message";
import { MoneyTags } from "./badges";
import { SpinMeter } from "./spin-meter";
import { TimeAgo } from "./time-ago";

const READ_KEY = "iltod-read";
const READ_MAX = 600;

function parseIds(raw: string): Set<number> {
  try {
    const ids = JSON.parse(raw);
    return new Set(Array.isArray(ids) ? ids.filter((x): x is number => typeof x === "number") : []);
  } catch {
    return new Set();
  }
}

/**
 * Kagi News-style story list: colored topic label, big headline, a check to mark it read.
 * Tapping a headline opens the AI summary in place (and marks the story read); the full
 * analysis is one more tap away. Read state lives in this browser only.
 */
export function StoryList({ stories }: { stories: ArticleListItem[] }) {
  const [raw, setRaw] = useLocalStorage(READ_KEY, "[]");
  const read = useMemo(() => parseIds(raw), [raw]);
  const [open, setOpen] = useState<number | null>(null);

  const update = useCallback(
    (fn: (s: Set<number>) => void) => {
      const next = new Set(read);
      fn(next);
      setRaw(JSON.stringify([...next].slice(-READ_MAX)));
    },
    [read, setRaw],
  );

  const toggleOpen = (id: number) => {
    setOpen((cur) => (cur === id ? null : id));
    update((s) => s.add(id));
  };
  const unread = stories.filter((s) => !read.has(s.id)).length;

  return (
    <div>
      <ul className="divide-y divide-secondary border-y border-secondary">
        {stories.map((s) => {
          const isRead = read.has(s.id);
          const isOpen = open === s.id;
          const { tag, color } = storyTag(s.sourceDomain, s.sourceCategory, s.sourceName, s.topic);
          return (
            <li key={s.id} className="py-5">
              <div className="flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p className={cx("text-xs font-semibold tracking-wider uppercase", color)}>
                    {tag}
                    {s.riskFlag && <span className="ml-2 text-error-primary">· Өндөр эрсдэл {s.riskScore}</span>}
                  </p>
                  {/* A real link (crawlers and new-tab clicks reach the article); a plain tap expands in place. */}
                  <a
                    href={`/article/${s.slug}`}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                      e.preventDefault();
                      toggleOpen(s.id);
                    }}
                    aria-expanded={isOpen}
                    className={cx(
                      "story-headline mt-1.5 block w-full cursor-pointer text-left font-semibold text-balance transition-colors",
                      isRead && !isOpen ? "text-tertiary" : "text-primary hover:text-brand-secondary",
                    )}
                  >
                    {s.title}
                  </a>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs text-quaternary">
                    <TimeAgo date={s.publishedAt} />
                    <span aria-hidden>·</span>
                    <span className="truncate">{s.sourceName}</span>
                    {s.clusterSize > 1 && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="font-medium text-tertiary">{s.clusterSize} эх сурвалж</span>
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => update((set) => (set.has(s.id) ? set.delete(s.id) : set.add(s.id)))}
                  aria-pressed={isRead}
                  aria-label={isRead ? "Уншаагүй болгох" : "Уншсан гэж тэмдэглэх"}
                  className={cx(
                    "mt-5 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition",
                    isRead ? "bg-quaternary text-secondary" : "text-fg-quaternary ring-1 ring-primary ring-inset hover:ring-brand",
                  )}
                >
                  <Check className="size-5" strokeWidth={2.5} />
                </button>
              </div>

              {/* CSS enter animation (tailwindcss-animate): keeps motion out of the home page bundle. */}
              {isOpen && (
                <div className="flex animate-in flex-col gap-4 pt-4 duration-200 fade-in slide-in-from-top-1">
                  <AIMessage compact tier="tier1" title="AI товчлол · баримт ба пи-ар ялгасан">
                    <ul className="mt-2 flex flex-col gap-2 text-md text-secondary">
                      {tldrSentences(s.tldr).map((b) => (
                        <li key={b} className="flex gap-2">
                          <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-solid" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </AIMessage>
                  <MoneyTags amounts={s.amounts} />
                  <SpinMeter neutrality={s.neutralityScore} />
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/article/${s.slug}`} className="rounded-lg bg-brand-solid px-4 py-2.5 text-sm font-semibold text-primary_on-brand shadow-xs hover:bg-brand-solid_hover">
                      Бүтэн шинжилгээ{s.hasDeepAnalysis ? " ⚡" : ""}
                    </Link>
                    <a
                      href={s.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-secondary ring-1 ring-primary ring-inset hover:bg-primary_hover"
                    >
                      Эх сурвалж <ArrowUpRight className="size-4" />
                    </a>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {stories.length > 0 && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => update((set) => stories.forEach((s) => set.add(s.id)))}
            disabled={unread === 0}
            className="w-full cursor-pointer rounded-xl bg-secondary py-3.5 text-md font-semibold text-secondary transition hover:bg-secondary_hover disabled:cursor-default disabled:opacity-60"
          >
            {unread === 0 ? "Бүгдийг уншсан ✓" : `Бүгдийг уншсан болгох (${unread})`}
          </button>
        </div>
      )}
    </div>
  );
}
