import { clip, type PushPayload } from "@/lib/push/core";

/** Server-side half of "Миний гишүүн" (see ./follow.ts). */
export interface MentionArticle {
  slug: string;
  title: string;
  people: string[];
}

/** One notification per subscription: its followed MPs named in the new articles. */
export function mentionAlerts(
  articles: MentionArticle[],
  politicians: { id: number; shortName: string }[],
  subs: { endpoint: string; follows: number[] }[],
): { endpoint: string; payload: PushPayload }[] {
  const out: { endpoint: string; payload: PushPayload }[] = [];
  for (const sub of subs) {
    const followed = politicians.filter((p) => sub.follows.includes(p.id));
    if (!followed.length) continue;
    const hits = articles.filter((a) => followed.some((p) => a.people.includes(p.shortName)));
    if (!hits.length) continue;
    const names = followed.filter((p) => hits.some((a) => a.people.includes(p.shortName))).map((p) => p.shortName);
    out.push({
      endpoint: sub.endpoint,
      payload: {
        title: clip(`👤 ${names.join(", ")} мэдээнд гарлаа`, 60),
        body: clip(hits.length > 1 ? `${hits[0].title} · +${hits.length - 1} мэдээ` : hits[0].title, 140),
        url: `/article/${hits[0].slug}`,
        tag: "mention",
      },
    });
  }
  return out;
}
