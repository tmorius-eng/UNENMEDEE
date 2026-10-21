import { ArrowRight } from "@untitledui/icons";
import Link from "next/link";
import { Suspense } from "react";

import { Empty } from "@/components/iltod/empty";
import { StoryList } from "@/components/iltod/story-list";
import { TopicBar } from "@/components/iltod/topic-bar";
import { formatUsd } from "@/lib/format";
import { type ArticleListItem, type DigestView, getDigests, getFeed, getSiteStats, parseFilter, type SiteStats } from "@/lib/queries";
import { findTopic } from "@/lib/topics";

const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

/** "Лхагва, 10-р сарын 21" in Ulaanbaatar time (UTC+8, no DST). */
function todayMn(): string {
  const ub = new Date(Date.now() + 8 * 3_600_000);
  return `${WEEKDAYS[ub.getUTCDay()]}, ${ub.getUTCMonth() + 1}-р сарын ${ub.getUTCDate()}`;
}

/** One entry per story: the same event from several sources is shown once. */
function onePerStory(items: ArticleListItem[]): ArticleListItem[] {
  const seen = new Set<number>();
  return items.filter((a) => {
    if (a.clusterId === null) return true;
    if (seen.has(a.clusterId)) return false;
    seen.add(a.clusterId);
    return true;
  });
}

function Masthead({ stats, digest }: { stats: SiteStats; digest: DigestView | undefined }) {
  return (
    <header className="flex flex-col gap-4 pb-2">
      <div>
        <h1 className="text-display-xs font-semibold tracking-tight text-primary md:text-display-sm">{todayMn()}</h1>
        <p className="mt-1 text-sm text-tertiary">
          {stats.activeSources} төрийн эх сурвалж · {stats.analyzed} мэдээ AI-аар шүүгдсэн · AI зардал {formatUsd(stats.aiCostThisMonthUsd)}
        </p>
      </div>
      {digest && (
        <Link href="/digest" className="group flex items-center gap-3 rounded-2xl bg-secondary px-4 py-3.5 transition hover:bg-secondary_hover">
          <span aria-hidden className="text-xl">
            📰
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold tracking-wider text-brand-secondary uppercase">Онцлох тойм</span>
            <span className="block truncate text-md font-semibold text-primary">{digest.title}</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-fg-quaternary transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </header>
  );
}

/**
 * Everything below the header is request-time (the topic comes from searchParams), which also
 * lets the date heading use the current time: prerendered parts may not read the clock.
 */
async function Feed({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const filter = parseFilter((await searchParams).f);
  const [feed, stats, [edition], [review]] = await Promise.all([getFeed(filter, 60), getSiteStats(), getDigests("12h", 1), getDigests("30d", 1)]);
  const stories = onePerStory(feed);
  const topic = findTopic(filter);
  return (
    <>
      <Masthead stats={stats} digest={edition ?? review} />
      <TopicBar active={filter} placement="inline" />
      {topic && <h2 className={`pt-6 text-xs font-semibold tracking-wider uppercase ${topic.color}`}>{topic.label}</h2>}
      <div className="mt-2">
        {stories.length ? (
          <StoryList stories={stories} />
        ) : (
          <Empty
            title={filter === "all" ? "Шинэ мэдээ хараахан алга" : "Энэ сэдвээр мэдээ алга"}
            description="Скрапер 2 цаг тутам төрийн сайтуудыг шалгаж, AI шинжилгээ хийсний дараа энд гарна."
          />
        )}
      </div>
      <TopicBar active={filter} placement="bottom" />
    </>
  );
}

export default function HomePage(props: PageProps<"/">) {
  return (
    // Narrow reading column like Kagi News; extra bottom space for the phone topic bar.
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-20 md:pb-0">
      <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-2xl bg-secondary" />}>
        <Feed searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
