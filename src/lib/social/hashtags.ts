/**
 * Hashtags per platform, picked for reach without spam: Facebook ranks 2–3 relevant tags best,
 * Threads links only one topic tag per post, Instagram allows 30 but rewards a few relevant ones.
 * The topic is the article's AI topic (src/lib/topics.ts); digests get the general set.
 */
export type SocialPlatform = "facebook" | "threads" | "instagram";

const BRAND = "#ИлТодМэдээ";

const TOPIC_TAGS: Record<string, string[]> = {
  politics: ["#улстөр", "#УИХ"],
  economy: ["#эдийнзасаг", "#төсөв"],
  corruption: ["#авлига", "#илтод"],
  justice: ["#хууль", "#шүүх"],
  mining: ["#уулуурхай", "#эрдэсбаялаг"],
  health: ["#эрүүлмэнд", "#эмнэлэг"],
  education: ["#боловсрол", "#сургууль"],
  society: ["#нийгэм", "#иргэд"],
  environment: ["#байгаль", "#агаарынбохирдол"],
  infrastructure: ["#дэдбүтэц", "#бүтээнбайгуулалт"],
  foreign: ["#гадаадхарилцаа", "#дипломат"],
  local: ["#ороннутаг", "#аймаг"],
  data: ["#нээлттэйөгөгдөл", "#статистик"],
  // Not a feed topic: the "15 жилийн өмнө" price videos (src/lib/video).
  prices: ["#үнэ", "#инфляц"],
};

export function hashtags(platform: SocialPlatform, topic?: string | null): string {
  const topical = (topic && TOPIC_TAGS[topic]) || [];
  if (platform === "threads") return topical[0] ?? "#мэдээ";
  if (platform === "facebook") return [BRAND, topical[0] ?? "#өдрийнмэдээ", "#Монгол"].join(" ");
  return [BRAND, ...topical, "#мэдээ", "#Монгол", "#Mongolia", "#mongolianews", "#Улаанбаатар", "#шинэмэдээ"].join(" ");
}
