import { notFound } from "next/navigation";

import { formatDateMn } from "@/lib/format";
import { OG_SIZE, ogImage } from "@/lib/og";
import { getArticleBySlug } from "@/lib/queries";
import { topicFor } from "@/lib/topics";

export const alt = "ИЛ ТОД МЭДЭЭ";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getArticleBySlug((await params).slug);
  // An unknown slug is a 404, not a fresh render: made-up slugs must not cost a render each.
  if (!article) notFound();
  const topic = topicFor(article.sourceDomain, article.sourceCategory, article.topic);
  return ogImage({
    eyebrow: topic.key === "local" || topic.key === "other" ? article.sourceName : topic.label,
    title: article.title,
    // Undated stories: publishedAt is when we found them, never shown as a publication date.
    footer: article.scrapeMeta?.date_unknown ? "Огноо тодорхойгүй" : article.publishedAt ? formatDateMn(article.publishedAt) : article.sourceName,
  });
}
