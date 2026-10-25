import { ArrowRight, Stars02 } from "@untitledui/icons";
import { cacheLife } from "next/cache";
import Link from "next/link";

import { editionLabel } from "@/lib/edition";
import { formatUsd } from "@/lib/format";
import { type ArticleListItem, type DigestView, type FeedFilter, getDigests, getFeed, getSiteStats, type SiteStats } from "@/lib/queries";
import { type TopicSeo, topicSeo } from "@/lib/topic-seo";
import { findTopic } from "@/lib/topics";

import { Empty } from "./empty";
import { FollowTopicButton } from "./follow-topic";
import { IntroStrip } from "./intro-strip";
import { MacroStrip } from "./macro-strip";
import { PlacePicker } from "./place-picker";
import { StatusTicker } from "./status-ticker";
import { StoryList } from "./story-list";
import { TopicBar } from "./topic-bar";

/** Stories rendered with the page; the rest load on demand. */
const FIRST_PAGE = 20;

const WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

/**
 * "Лхагва, 10-р сарын 21" in Ulaanbaatar time (UTC+8, no DST). Cached so the page stays fully
 * prerendered: Cache Components refuses a bare Date.now() there. Revalidates with the feed.
 */
async function todayMn(): Promise<string> {
  "use cache";
  cacheLife("minutes");
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

/** The most important of the newest stories leads the home page as a card (ties: the newer one). */
function pickLead(stories: ArticleListItem[]): number | undefined {
  let best: ArticleListItem | undefined;
  // Undated stories never lead: "today's top story" needs a date.
  for (const s of stories.slice(0, 8)) if (!s.dateUnknown && (!best || (s.importanceScore ?? -1) > (best.importanceScore ?? -1))) best = s;
  return best?.id;
}


async function Masthead({ stats, digest, seo }: { stats: SiteStats; digest: DigestView | undefined; seo?: TopicSeo }) {
  return (
    <header className="flex flex-col gap-4 pb-2">
      <div>
        {seo ? (
          // A topic page is about one subject: its visible heading is the phrase people search for.
          <>
            <h1 className="text-display-xs font-semibold tracking-tight text-balance text-primary md:text-display-sm">{seo.heading}</h1>
            <p className="mt-1 text-md text-tertiary">{await todayMn()}</p>
          </>
        ) : (
          <h1 className="text-display-xs font-semibold tracking-tight text-primary md:text-display-sm">
            {/* Read by search engines and screen readers; the visible heading stays the date. */}
            <span className="sr-only">Монголын улс төр, эдийн засаг, төрийн шинэ мэдээ, </span>
            {await todayMn()}
          </h1>
        )}
        <span aria-hidden className="mt-2 block h-1 w-12 rounded-full bg-brand-solid" />
        <StatusTicker
          stats={`${stats.activeSources} төрийн эх сурвалж · ${stats.analyzed} мэдээ AI-аар шүүгдсэн · AI зардал ${formatUsd(stats.aiCostThisMonthUsd)}`}
          lastArticleAt={stats.lastArticleAt}
          todayArticles={stats.todayArticles}
        />
      </div>
      {digest && (
        <Link href="/digest" prefetch={false} className="group flex items-center gap-3 rounded-2xl bg-primary px-4 py-3.5 shadow-xs ring-1 ring-secondary transition ring-inset hover:bg-primary_hover">
          <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-secondary text-fg-brand-primary">
            <Stars02 className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold tracking-wider text-brand-secondary uppercase">{editionLabel(digest)}</span>
            <span className="block truncate text-md font-semibold text-primary">{digest.title}</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-fg-quaternary transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </header>
  );
}

/**
 * The Kagi-style reading column for "/" (filter "all") and "/topic/<key>". Everything comes from
 * cached queries, so both routes are prerendered and served from the CDN (fast LCP, metadata in
 * <head>); they refresh with the queries' cacheLife.
 */
export async function HomeFeed({ filter }: { filter: FeedFilter }) {
  // 20 on the page, the rest behind "Цааш үзэх" (/api/feed/<filter>): 40 rows made the phone
  // hydrate 1,000+ DOM nodes and Lighthouse mobile measured 2 s of Total Blocking Time.
  const [feed, stats, [edition], [review]] = await Promise.all([getFeed(filter, FIRST_PAGE), getSiteStats(), getDigests("12h", 1), getDigests("30d", 1)]);
  const stories = onePerStory(feed);
  const topic = findTopic(filter);
  const seo = filter === "all" ? undefined : topicSeo(filter);
  return (
    // Narrow reading column like Kagi News; extra bottom space for the phone topic bar.
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 pb-20 md:pb-0">
      <Masthead stats={stats} digest={edition ?? review} seo={seo} />
      {seo && (
        <div className="flex flex-col gap-1 text-sm text-secondary">
          <p>{seo.intro}</p>
          <p className="text-tertiary">
            ИЛ ТОД МЭДЭЭ (iltodmedee.mn) · {seo.latin.join(", ")}
          </p>
        </div>
      )}
      {filter === "all" && <IntroStrip sources={stats.activeSources} />}
      {filter === "all" && <MacroStrip compact />}
      {filter === "local" && <PlacePicker />}
      <TopicBar active={filter} placement="inline" />
      {topic && (
        <div className="flex items-center justify-between gap-3 pt-6">
          <h2 className={`text-xs font-semibold tracking-wider uppercase ${topic.color}`}>{topic.label}</h2>
          <FollowTopicButton topic={topic.key} />
        </div>
      )}
      <div className="mt-2">
        {stories.length ? (
          <StoryList stories={stories} leadId={filter === "all" ? pickLead(stories) : undefined} moreFeed={feed.length >= FIRST_PAGE ? filter : undefined} />
        ) : (
          <Empty
            title={filter === "all" ? "Шинэ мэдээ хараахан алга" : "Энэ сэдвээр мэдээ алга"}
            description="Скрапер 2 цаг тутам төрийн сайтуудыг шалгаж, AI шинжилгээ хийсний дараа энд гарна."
          />
        )}
      </div>
      <TopicBar active={filter} placement="bottom" />
    </div>
  );
}
