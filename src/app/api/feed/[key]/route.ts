import { FEED_FILTERS, type FeedFilter, getFeed } from "@/lib/queries";

/** Feed size behind the "Цааш үзэх" button (the page itself shows the first 20). */
const MORE_LIMIT = 40;

/**
 * The longer feed for "/" and "/topic/<key>", fetched only when the reader taps "Цааш үзэх": the
 * page itself renders 20 stories, so its HTML, RSC payload and hydration stay half the size on
 * phones (Lighthouse mobile TBT). Prerendered per filter and refreshed with the feed cache.
 */
export function generateStaticParams() {
  return [...new Set(FEED_FILTERS)].map((key) => ({ key }));
}

export async function GET(_: Request, ctx: RouteContext<"/api/feed/[key]">) {
  const { key } = await ctx.params;
  if (!(FEED_FILTERS as readonly string[]).includes(key)) return Response.json({ error: "unknown feed" }, { status: 404 });
  return Response.json(await getFeed(key as FeedFilter, MORE_LIMIT));
}
