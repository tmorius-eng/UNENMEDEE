"use client";

import { ArrowUpRight, Check, LayersTwo01 } from "@untitledui/icons";
import dynamic from "next/dynamic";
import Link from "next/link";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { PushInvite } from "@/components/pwa/push-invite";
import { largestAmount, tldrSentences } from "@/lib/format";
import { useLocalStorage } from "@/lib/local-store";
import { parseIds, READ_KEY, READ_MAX } from "@/lib/read-state";
import type { ArticleListItem } from "@/lib/queries";
import { safeHttpUrl } from "@/lib/site";
import { storyTag } from "@/lib/topics";
import { cx } from "@/utils/cx";

import { AIMessage } from "./ai-message";
import { MoneyTags } from "./badges";
import { SpinMeter } from "./spin-meter";
import { TimeAgo } from "./time-ago";

// Shown only inside an opened story: loaded on the first open, not with the home page.
const ShareButton = dynamic(() => import("./share-button").then((m) => m.ShareButton), {
  loading: () => <span aria-hidden className="h-10 w-34 rounded-lg ring-1 ring-primary ring-inset" />,
});

interface RowProps {
  s: ArticleListItem;
  isRead: boolean;
  isOpen: boolean;
  lead: boolean;
  onOpen: (id: number) => void;
  onToggleRead: (id: number) => void;
}

/** One story. Memoised with stable handlers, so marking or opening one story re-renders one row, not 40. */
const StoryRow = memo(function StoryRow({ s, isRead, isOpen, lead, onOpen, onToggleRead }: RowProps) {
  const { tag, color, dot } = storyTag(s.sourceDomain, s.sourceCategory, s.sourceName, s.topic);
  const teaser = tldrSentences(s.tldr, lead ? 2 : 1).join(" ");
  return (
    <li key={s.id} className={cx(lead ? "relative rounded-2xl bg-primary p-5 shadow-xs ring-1 ring-secondary ring-inset md:p-6" : "py-5")}>
      {/* The bar sits in a clip box with the card's radius, so it follows the rounded corners. */}
      {lead && (
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <span className={cx("block h-1", dot)} />
        </span>
      )}
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={cx("flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase", color)}>
              <span aria-hidden className={cx("size-2 rounded-full", dot)} />
              {lead ? `Гол мэдээ · ${tag}` : tag}
            </span>
            {s.riskFlag && (
              <Badge type="pill-color" color="error" size="sm">
                Өндөр эрсдэл {s.riskScore}
              </Badge>
            )}
          </p>
          {/* A real link (crawlers and new-tab clicks reach the article); a plain tap expands in place. */}
          <a
            href={`/article/${s.slug}`}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
              e.preventDefault();
              onOpen(s.id);
            }}
            aria-expanded={isOpen}
            className={cx(
              "mt-1.5 block w-full cursor-pointer text-left font-semibold text-balance transition-colors",
              lead ? "text-display-xs tracking-tight" : "story-headline",
              isRead && !isOpen ? "text-tertiary" : "text-primary hover:text-brand-secondary",
            )}
          >
            {s.title}
          </a>
          {teaser && !isOpen && <p className={cx("mt-1.5 text-sm text-tertiary", lead ? "line-clamp-3 md:text-md" : "line-clamp-2")}>{teaser}</p>}
          {/* No "·" between the time and the source: on phones the row wraps and a separator was left dangling at the line end. */}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-quaternary">
            {s.dateUnknown ? (
                // The page printed no date: say when we found it, so the row still tells the reader how fresh it is.
                <span title="Эх хуудсанд нийтэлсэн огноо байхгүй: бидний олсон цаг">
                  Огноо тодорхойгүй · <TimeAgo date={s.publishedAt} /> олдсон
                </span>
              ) : (
                <TimeAgo date={s.publishedAt} />
              )}
            <span className="max-w-full truncate font-medium text-tertiary">{s.sourceName}</span>
            {s.amounts.length > 0 && (
              <Badge type="pill-color" color="warning" size="sm">
                {largestAmount(s.amounts)}
              </Badge>
            )}
            {s.clusterSize > 1 && (
              <BadgeWithIcon type="pill-color" color="brand" size="sm" iconLeading={LayersTwo01}>
                {s.clusterSize} эх сурвалж
              </BadgeWithIcon>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onToggleRead(s.id)}
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
              href={safeHttpUrl(s.originalUrl)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-secondary ring-1 ring-primary ring-inset hover:bg-primary_hover"
            >
              Эх сурвалж <ArrowUpRight className="size-4" />
            </a>
            <ShareButton path={`/article/${s.slug}`} title={s.title} />
          </div>
        </div>
      )}
    </li>
  );
});

/**
 * Kagi News-style story list: colored topic label, big headline, the AI's first sentence as a
 * teaser, ₮ / source-count chips and a check to mark it read. `leadId` renders that story as a
 * card on top (the home page's most important recent story). Tapping a headline opens the AI
 * summary in place (and marks the story read); the full analysis is one more tap away. Read
 * state lives in this browser only.
 */
/**
 * The next stories of the same feed (`/api/feed/<key>`), without the ones already shown or another
 * source's copy of a shown story. JSON dates come back as strings.
 */
async function loadMore(feed: string, shown: ArticleListItem[]): Promise<ArticleListItem[]> {
  const res = await fetch(`/api/feed/${feed}`);
  if (!res.ok) throw new Error(String(res.status));
  const items = ((await res.json()) as ArticleListItem[]).map((s) => ({ ...s, publishedAt: s.publishedAt ? new Date(s.publishedAt) : null }));
  const ids = new Set(shown.map((s) => s.id));
  const clusters = new Set(shown.map((s) => s.clusterId).filter((c): c is number => c !== null));
  return items.filter((s) => {
    if (ids.has(s.id) || (s.clusterId !== null && clusters.has(s.clusterId))) return false;
    ids.add(s.id);
    if (s.clusterId !== null) clusters.add(s.clusterId);
    return true;
  });
}

/**
 * `moreFeed` (a feed key) adds a "Цааш үзэх" button: the page renders only the first stories, so
 * phones hydrate half as many rows (mobile Total Blocking Time), and the rest load on demand.
 */
export function StoryList({ stories: first, leadId, moreFeed }: { stories: ArticleListItem[]; leadId?: number; moreFeed?: string }) {
  const [more, setMore] = useState<ArticleListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const stories = useMemo(() => (more ? [...first, ...more] : first), [first, more]);
  const [raw, setRaw] = useLocalStorage(READ_KEY, "[]");
  const read = useMemo(() => parseIds(raw), [raw]);
  const [open, setOpen] = useState<number | null>(null);

  // The handlers read the current set through a ref so their identity never changes: a changing
  // callback would re-render every memoised row on each tap.
  const readRef = useRef(read);
  useEffect(() => {
    readRef.current = read;
  }, [read]);
  const update = useCallback(
    (fn: (s: Set<number>) => void) => {
      const next = new Set(readRef.current);
      fn(next);
      setRaw(JSON.stringify([...next].slice(-READ_MAX)));
    },
    [setRaw],
  );
  const toggleOpen = useCallback(
    (id: number) => {
      setOpen((cur) => (cur === id ? null : id));
      update((s) => s.add(id));
    },
    [update],
  );
  const toggleRead = useCallback((id: number) => update((set) => (set.has(id) ? set.delete(id) : set.add(id))), [update]);
  const unread = stories.filter((s) => !read.has(s.id)).length;

  const item = (s: ArticleListItem) => <StoryRow key={s.id} s={s} isRead={read.has(s.id)} isOpen={open === s.id} lead={s.id === leadId} onOpen={toggleOpen} onToggleRead={toggleRead} />;
  const lead = stories.find((s) => s.id === leadId);
  const rest = lead ? stories.filter((s) => s !== lead) : stories;

  return (
    <div>
      {lead && <ul className="mb-3">{item(lead)}</ul>}
      <ul className="divide-y divide-secondary border-y border-secondary">{rest.map(item)}</ul>

      {moreFeed && more === null && stories.length > 0 && (
        <button
          type="button"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setMoreError(false);
            loadMore(moreFeed, first)
              .then(setMore)
              .catch(() => setMoreError(true))
              .finally(() => setLoading(false));
          }}
          className="mt-4 h-12 w-full cursor-pointer rounded-xl bg-primary text-md font-semibold text-brand-secondary ring-1 ring-secondary transition ring-inset hover:bg-primary_hover disabled:cursor-wait disabled:opacity-70"
        >
          {loading ? "Ачаалж байна…" : moreError ? "Ачаалж чадсангүй. Дахин оролдох" : "Цааш үзэх"}
        </button>
      )}

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
      {stories.length > 0 && <PushInvite />}
    </div>
  );
}
