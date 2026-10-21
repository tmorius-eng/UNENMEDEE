import { formatDateMn } from "@/lib/format";
import { OG_SIZE, ogImage } from "@/lib/og";
import { getArticleBySlug } from "@/lib/queries";
import { topicFor } from "@/lib/topics";

export const alt = "ИЛ ТОД МЭДЭЭ";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getArticleBySlug((await params).slug);
  if (!article) return ogImage({ eyebrow: "Мэдээ", title: "Мэдээ олдсонгүй", footer: "" });
  const topic = topicFor(article.sourceDomain, article.sourceCategory, article.topic);
  return ogImage({
    eyebrow: topic.key === "local" || topic.key === "other" ? article.sourceName : topic.label,
    title: article.title,
    footer: article.publishedAt ? formatDateMn(article.publishedAt) : article.sourceName,
  });
}
