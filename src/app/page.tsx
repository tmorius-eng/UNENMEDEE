import { Suspense } from "react";

import { ArticleGrid } from "@/components/iltod/article-grid";
import { BentoHero } from "@/components/iltod/bento-hero";
import { Empty } from "@/components/iltod/empty";
import { FeedTabs } from "@/components/iltod/feed-tabs";
import { FeedSkeleton } from "@/components/iltod/skeletons";
import { getClusters, getFeed, getSiteStats, parseFilter } from "@/lib/queries";

async function Hero() {
  const [stats, topRisk, topClusters] = await Promise.all([getSiteStats(), getFeed("risk", 3), getClusters(3, 7)]);
  return <BentoHero stats={stats} topRisk={topRisk} topClusters={topClusters} />;
}

async function Feed({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const filter = parseFilter((await searchParams).f);
  const articles = await getFeed(filter);
  return (
    <>
      <FeedTabs active={filter} />
      <div className="mt-6">
        {articles.length ? (
          <ArticleGrid articles={articles} />
        ) : (
          <Empty
            title="Шинэ мэдээ хараахан алга"
            description="Скрапер 2 цаг тутам төрийн сайтуудыг шалгаж, AI шинжилгээ хийсний дараа энд гарна."
          />
        )}
      </div>
    </>
  );
}

export default function HomePage(props: PageProps<"/">) {
  return (
    <div className="flex flex-col gap-12">
      <Suspense fallback={<div className="h-[420px] animate-pulse rounded-3xl bg-primary ring-1 ring-secondary ring-inset" />}>
        <Hero />
      </Suspense>
      <section aria-labelledby="feed-title" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="feed-title" className="text-display-xs font-semibold text-primary">
              Сүүлийн мэдээ
            </h2>
            <p className="mt-1 text-sm text-tertiary">Баримт ба пи-арыг AI-аар ялгасан, эх сурвалж бүр нь шалгагдах боломжтой.</p>
          </div>
        </div>
        <Suspense
          fallback={
            <>
              <FeedTabs active="all" />
              <div className="mt-6">
                <FeedSkeleton />
              </div>
            </>
          }
        >
          <Feed searchParams={props.searchParams} />
        </Suspense>
      </section>
    </div>
  );
}
