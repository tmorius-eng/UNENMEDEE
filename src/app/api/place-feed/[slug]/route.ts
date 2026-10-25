import { findPlace, PLACES } from "@/lib/places";
import { getPlaceFeed } from "@/lib/queries";

/** One place's newest stories for "Миний мэдээ" (/my). Prerendered per place, refreshed with the feed cache. */
export function generateStaticParams() {
  return PLACES.map((p) => ({ slug: p.slug }));
}

export async function GET(_: Request, ctx: RouteContext<"/api/place-feed/[slug]">) {
  const place = findPlace((await ctx.params).slug);
  if (!place) return Response.json({ error: "unknown place" }, { status: 404 });
  return Response.json(await getPlaceFeed(place.domains, 20));
}
