import { z } from "zod";

import { truncate } from "@/lib/text";
import type { ReaderImpact } from "@/lib/types";

import type { ChatMessage } from "./gemini";
import { DATA_GUARD, wrap } from "./prompts";
import { cleanImpact, cleanReaderTitle, sourceDigits } from "./reader-view";

/**
 * Plain headlines and "Танд хамаатай юу?" for articles analysed before Tier 1 wrote them
 * (`npm run ai:reader`): one cheap call handles READER_BATCH stories from their headline, summary
 * and facts, instead of re-running the full analysis. The same grounding applies: a number the
 * story never printed drops the field.
 */
export const READER_BATCH = 8;
/** A row the model answered for this many times without a usable headline is left as it is. */
export const READER_MAX_ATTEMPTS = 2;

export interface ReaderItem {
  id: number;
  title: string;
  summary: string;
  facts: string[];
}

export function readerMessages(items: ReaderItem[]): ChatMessage[] {
  const list = items
    .map((i) => `[${i.id}]\nГарчиг: ${truncate(i.title, 220)}\nТовч: ${truncate(i.summary.replace(/\s+/g, " "), 420)}\nБаримт: ${truncate(i.facts.join("; "), 360)}`)
    .join("\n\n");
  return [
    {
      role: "system",
      content: `Чи төрийн байгууллагын мэдээг залуу уншигчид ойлгомжтой болгодог редактор. Мэдээ бүрт:
- "title": энгийн хүний гарчиг, 80 тэмдэгтээс богино. Юу шийдэгдсэн, юу өөрчлөгдөх, хэдэн төгрөг вэ гэдгийг урдаа; тоо, ₮ дүн, огноо байвал оруул. "Хүлээн авч уулзлаа", "зохион байгууллаа" гэх мэт протоколын хэллэг, албан тушаалын урт нэр, магтаал бүү ашигла.
- "who": хэнд шууд хамаатай вэ (богино), "change": тэдний амьдралд юу өөрчлөгдөх вэ (1 өгүүлбэр), "when": хэзээнээс хэрэгжих (текстэд яг тэр утгаар бичигдсэн огноо; мэдээ гарсан, хурал болсон өдөр биш), "action": уншигч юу хийх ёстой вэ (текстэд байвал). Тодорхойгүй бол null. Уулзалт, ёслол, айлчлалд ихэвчлэн бүгд null.
Өгөгдсөн текстэд байхгүй тоо, нэр, баримт бүү нэм.
ЗӨВХӨН JSON: {"items": {"<id>": {"title": "...", "who": null, "change": null, "when": null, "action": null}}}${DATA_GUARD}`,
    },
    { role: "user", content: wrap("news_list", list) },
  ];
}

export const ReaderBatchSchema = z.object({
  items: z.record(z.string(), z.unknown()),
});

export interface ReaderView {
  title: string | null;
  impact: ReaderImpact | null;
}

/** The model's answer for one item, grounded in that item's own text. */
export function readerViewFor(item: ReaderItem, answer: unknown): ReaderView {
  if (!answer || typeof answer !== "object") return { title: null, impact: null };
  const a = answer as Record<string, unknown>;
  const digits = sourceDigits(`${item.title}\n${item.summary}\n${item.facts.join("\n")}`);
  return { title: cleanReaderTitle(a.title, item.title, digits), impact: cleanImpact(a, digits) };
}
