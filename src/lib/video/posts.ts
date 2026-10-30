/**
 * The text that goes with a price video on Facebook, Instagram and Threads. Client-safe and pure:
 * the numbers are the ones the video shows (stored with it as `VideoMeta`), worded as plain
 * nominal ₮ with the source, never a verdict.
 */
import { formatNumber } from "@/lib/format";
import { hashtags } from "@/lib/social/hashtags";
import { cut, THREADS_MAX, threadsLength } from "@/lib/social/threads";
import { PRODUCTION_URL } from "@/lib/site";

export interface VideoMeta {
  kind: "prices";
  goodKey: string;
  title: string;
  then: { month: string; value: number; years: number };
  now: { month: string; value: number };
  yearPct: number | null;
  /** "iltodmedee.mn/prices#beef" */
  link: string;
}

const monthLabel = (m: string) => `${m.slice(0, 4)} оны ${Number(m.slice(5, 7))}-р сар`;

function core(v: VideoMeta): string[] {
  const year =
    v.yearPct === null ? [] : v.yearPct >= 1 ? [`📈 Сүүлийн 1 жилд ▲ ${v.yearPct}%`] : v.yearPct <= -1 ? [`📉 Сүүлийн 1 жилд ▼ ${-v.yearPct}%`] : ["Сүүлийн 1 жилд бараг өөрчлөгдөөгүй"];
  return [
    `🛒 ${v.title}: ${v.then.years} жилийн өмнө ${formatNumber(v.then.value)}₮ → одоо ${formatNumber(v.now.value)}₮`,
    ...year,
    `Улаанбаатарын сарын дундаж үнэ (${monthLabel(v.then.month)} ба ${monthLabel(v.now.month)}), нэрлэсэн ₮. Эх сурвалж: Үндэсний статистикийн хороо.`,
  ];
}

const url = (v: VideoMeta, site: string) => `${site}/${v.link.replace(/^iltodmedee\.mn\//, "")}`;

export function facebookVideoText(v: VideoMeta, site = PRODUCTION_URL): string {
  return [...core(v), "", `👉 13 барааны 15 жилийн үнэ: ${url(v, site)}`, "", hashtags("facebook", "prices")].join("\n");
}

export function instagramVideoCaption(v: VideoMeta): string {
  return [...core(v), "", "13 барааны 15 жилийн үнэ, аймаг бүрээр: iltodmedee.mn (холбоос bio-д)", "", hashtags("instagram", "prices")].join("\n");
}

export function threadsVideoText(v: VideoMeta, site = PRODUCTION_URL): string {
  const tail = `\n\n👉 ${url(v, site)}\n${hashtags("threads", "prices")}`;
  return cut(core(v).join("\n"), THREADS_MAX - threadsLength(tail)) + tail;
}
