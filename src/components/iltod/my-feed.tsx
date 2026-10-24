"use client";

import { Suspense, use } from "react";

import type { ArticleListItem } from "@/lib/queries";
import { useLocalStorage } from "@/lib/local-store";
import { parseTopicFollows, TOPIC_FOLLOW_KEY } from "@/lib/topic-follow";
import { TOPICS } from "@/lib/topics";

import { FollowTopicButton } from "./follow-topic";
import { StoryList } from "./story-list";

const MAX_STORIES = 40;
const requests = new Map<string, Promise<ArticleListItem[]>>();

/** One request per topic per page view; JSON dates come back as strings. */
function topicFeed(key: string): Promise<ArticleListItem[]> {
  let p = requests.get(key);
  if (!p) {
    p = fetch(`/api/topic-feed/${key}`)
      .then((r) => (r.ok ? (r.json() as Promise<ArticleListItem[]>) : []))
      .then((items) => items.map((s) => ({ ...s, publishedAt: s.publishedAt ? new Date(s.publishedAt) : null })))
      .catch(() => []);
    requests.set(key, p);
  }
  return p;
}

/** Newest first, each story once, one per cross-source cluster. */
function merge(lists: ArticleListItem[][]): ArticleListItem[] {
  const seen = new Set<number>();
  const clusters = new Set<number>();
  return lists
    .flat()
    .sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0))
    .filter((s) => {
      if (seen.has(s.id) || (s.clusterId !== null && clusters.has(s.clusterId))) return false;
      seen.add(s.id);
      if (s.clusterId !== null) clusters.add(s.clusterId);
      return true;
    })
    .slice(0, MAX_STORIES);
}

const keyPromises = new Map<string, Promise<ArticleListItem[][]>>();
function feeds(keys: string[]): Promise<ArticleListItem[][]> {
  const id = keys.join(",");
  let p = keyPromises.get(id);
  if (!p) keyPromises.set(id, (p = Promise.all(keys.map(topicFeed))));
  return p;
}

function Stories({ keys }: { keys: string[] }) {
  const stories = merge(use(feeds(keys)));
  if (stories.length === 0) return <p className="py-10 text-center text-sm text-tertiary">Дагасан сэдвүүдэд шинэ мэдээ алга байна.</p>;
  return <StoryList stories={stories} />;
}

function TopicPicker({ follows }: { follows: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TOPICS.map((t) => (
        <FollowTopicButton key={t.key} topic={t.key} label={t.label} className={follows.includes(t.key) ? undefined : "text-tertiary"} />
      ))}
    </div>
  );
}

/** "Миний мэдээ": the newest stories of the topics this browser follows. */
export function MyFeed() {
  const [raw] = useLocalStorage(TOPIC_FOLLOW_KEY, "[]");
  const follows = parseTopicFollows(raw);
  if (follows.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl bg-primary p-5 ring-1 ring-secondary ring-inset">
        <p className="text-md font-semibold text-primary">Сонирхсон сэдвээ ⭐ дагаарай</p>
        <p className="text-sm text-tertiary">Сонгосон сэдвүүдийн шинэ мэдээ энд нэг урсгалд цуглана. Сонголт зөвхөн энэ төхөөрөмжид хадгалагдана.</p>
        <TopicPicker follows={follows} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <details className="rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset">
        <summary className="cursor-pointer text-sm font-semibold text-secondary">
          Дагаж буй сэдэв: {follows.map((k) => TOPICS.find((t) => t.key === k)?.label).join(", ")} · засах
        </summary>
        <div className="mt-3">
          <TopicPicker follows={follows} />
        </div>
      </details>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-secondary" />}>
        <Stories keys={follows} />
      </Suspense>
    </div>
  );
}
