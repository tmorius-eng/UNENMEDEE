import { z } from "zod";

import { AI_TOPIC_KEYS, isAiTopic } from "@/lib/topics";
import { truncate } from "@/lib/text";

import type { ChatMessage } from "./gemini";

/**
 * Batch topic tagging for articles analyzed before Tier 1 returned a topic: one cheap call
 * classifies up to 25 headlines (title + summary), instead of re-running the full analysis.
 */
export const TOPIC_BATCH = 25;

export interface TopicItem {
  id: number;
  title: string;
  summary: string;
}

export function topicMessages(items: TopicItem[]): ChatMessage[] {
  const list = items.map((i) => `${i.id}: ${truncate(i.title, 160)} — ${truncate(i.summary.replace(/\s+/g, " "), 220)}`).join("\n");
  return [
    {
      role: "system",
      content: `Монголын төрийн байгууллагын мэдээг АГУУЛГААР нь сэдэвт ангил. Боломжит сэдэв: ${AI_TOPIC_KEYS.join(", ")}.
politics = УИХ, Засгийн газар, нам, томилгоо; economy = төсөв, татвар, санхүү, үнэ, бизнес, тендер; corruption = авлига, аудит, хяналт;
justice = хууль, шүүх, цагдаа, гэмт хэрэг; mining = уул уурхай, эрчим хүч; health = эрүүл мэнд; education = боловсрол, соёл, спорт;
society = халамж, хөдөлмөр, гэр бүл, хүүхэд, хот, амьтан; environment = байгаль, ус, цаг уур, хөдөө аж ахуй;
infrastructure = зам, барилга, харилцаа холбоо, технологи; foreign = гадаад харилцаа, батлан хамгаалах.
ЗӨВХӨН JSON буцаа: {"topics": {"<id>": "<сэдэв>", ...}}`,
    },
    { role: "user", content: list },
  ];
}

export const TopicBatchSchema = z.object({
  topics: z.record(z.string(), z.unknown()).transform((rec) => {
    const out = new Map<number, string>();
    for (const [k, v] of Object.entries(rec)) {
      const id = Number(k);
      const topic = typeof v === "string" ? v.trim().toLowerCase() : "";
      if (Number.isInteger(id) && isAiTopic(topic)) out.set(id, topic);
    }
    return out;
  }),
});
