import { type FeedFilter, getFeed } from "@/lib/queries";
import { FOLLOWABLE_TOPICS, isFollowableTopic } from "@/lib/topic-follow";

/** One topic's newest stories for "Миний мэдээ" (/my). Prerendered per topic, refreshed with the feed cache. */
export function generateStaticParams() {
  return FOLLOWABLE_TOPICS.map((key) => ({ key }));
}

export async function GET(_: Request, ctx: RouteContext<"/api/topic-feed/[key]">) {
  const { key } = await ctx.params;
  if (!isFollowableTopic(key)) return Response.json({ error: "unknown topic" }, { status: 404 });
  return Response.json(await getFeed(key as FeedFilter, 20));
}
