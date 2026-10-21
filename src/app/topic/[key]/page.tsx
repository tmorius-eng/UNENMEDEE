import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { HomeFeed } from "@/components/iltod/home-feed";
import { FEED_FILTERS, type FeedFilter } from "@/lib/queries";
import { findTopic } from "@/lib/topics";

const LABELS: Record<string, string> = { risk: "Эрсдэлтэй мэдээ", budget: "Төсөв, тендер", ministry: "Яамдын шийдвэр" };

function filterFrom(key: string): FeedFilter | null {
  return key !== "all" && (FEED_FILTERS as readonly string[]).includes(key) ? (key as FeedFilter) : null;
}

/** Every topic is prerendered, so its title and description are in <head> for crawlers. */
export function generateStaticParams() {
  return FEED_FILTERS.filter((f) => f !== "all").map((key) => ({ key }));
}

export async function generateMetadata({ params }: PageProps<"/topic/[key]">): Promise<Metadata> {
  const filter = filterFrom((await params).key);
  if (!filter) return { title: "Сэдэв олдсонгүй", robots: { index: false } };
  const label = findTopic(filter)?.label ?? LABELS[filter] ?? filter;
  const title = `${label} — шинэ мэдээ`;
  const description = `${label} сэдвийн өнөөдрийн шинэ мэдээ: төрийн байгууллагуудын албан мэдээг AI-аар шүүж, баримтыг пи-араас салгасан товч хураангуй.`;
  return { title, description, alternates: { canonical: `/topic/${filter}` }, openGraph: { title, description, url: `/topic/${filter}` } };
}

async function TopicFeed({ params }: { params: PageProps<"/topic/[key]">["params"] }) {
  const filter = filterFrom((await params).key);
  if (!filter) notFound();
  return <HomeFeed filter={filter} />;
}

export default function TopicPage(props: PageProps<"/topic/[key]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[32rem] w-full max-w-2xl animate-pulse rounded-2xl bg-secondary" />}>
      <TopicFeed params={props.params} />
    </Suspense>
  );
}
