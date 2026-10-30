/**
 * "15 жилийн өмнө" price videos (Reels / Threads, 1080×1920, ~25 s): one everyday good from the
 * NSO price snapshot (`prices_nso`, src/lib/budget/prices.ts), its Улаанбаатар price then and now,
 * the multiple, the change in a year and the 1/5/10/15-year points. Every number comes from the
 * snapshot; the narration gets them as words (mn-numbers.ts) and the captions as digits, and
 * `verifySpec` refuses a spec whose captions name a number the snapshot does not hold.
 */
import { formatNumber } from "@/lib/format";
import { agoPoints, type GoodSeries, type PricesSnapshot, valueAt } from "@/lib/budget/prices";

import { numberWords, timesPhrase } from "./mn-numbers";

export type Panel = "ratio" | "tiles" | "link";

export interface Sentence {
  /** What the voice says: words only, no digits. */
  say: string;
  /** The caption on screen; `<em>` marks the yellow number (our own markup, escaped text). */
  caption: string;
  /** The extra panel shown while this sentence is spoken. */
  panel?: Panel;
  /** The chart sweeps from the old point to today during this sentence. */
  sweep?: boolean;
}

export interface Tile {
  label: string;
  value: string;
  pct: string;
}

export interface VideoSpec {
  /** Unique per good and data month: one video each time NSO publishes a month. */
  key: string;
  goodKey: string;
  kicker: string;
  title: string;
  sub: string;
  months: string[];
  series: (number | null)[];
  /** Index of the old point and of the latest month in `months`. */
  from: number;
  to: number;
  ratioChip: string;
  ratioNote: string;
  tiles: Tile[];
  sentences: Sentence[];
  source: string;
  /** The page with the whole series, shown at the end and linked in the posts. */
  link: string;
  /** Facts for the post texts. */
  then: { month: string; value: number; years: number };
  now: { month: string; value: number };
  yearPct: number | null;
}

/** How each good is named on screen and aloud ("1 кг үхрийн мах" / "нэг кило үхрийн мах"). */
export const SPOKEN: Record<string, { caption: string; say: string; title: string; unit: string }> = {
  beef: { caption: "1 кг үхрийн мах", say: "нэг кило үхрийн мах", title: "Үхрийн мах, 1 кг", unit: "ястай" },
  mutton: { caption: "1 кг хонины мах", say: "нэг кило хонины мах", title: "Хонины мах, 1 кг", unit: "ястай" },
  flour: { caption: "1 кг гурил", say: "нэг кило нэгдүгээр зэргийн гурил", title: "Гурил, 1 кг", unit: "1-р зэрэг" },
  bread: { caption: "1 талх", say: "нэг талх", title: "Талх, 1 ширхэг", unit: "" },
  rice: { caption: "1 кг цагаан будаа", say: "нэг кило цагаан будаа", title: "Цагаан будаа, 1 кг", unit: "" },
  milk: { caption: "1 л задгай сүү", say: "нэг литр задгай сүү", title: "Сүү, 1 литр", unit: "задгай" },
  egg: { caption: "1 өндөг", say: "нэг өндөг", title: "Өндөг, 1 ширхэг", unit: "" },
  potato: { caption: "1 кг төмс", say: "нэг кило төмс", title: "Төмс, 1 кг", unit: "" },
  sugar: { caption: "1 кг элсэн чихэр", say: "нэг кило элсэн чихэр", title: "Элсэн чихэр, 1 кг", unit: "" },
  petrol: { caption: "1 л А-92 бензин", say: "нэг литр А ерэн хоёр бензин", title: "Бензин А-92, 1 литр", unit: "" },
  diesel: { caption: "1 л дизель түлш", say: "нэг литр дизель түлш", title: "Дизель түлш, 1 литр", unit: "" },
  canteen: { caption: "гуанзны 1 порц хоол", say: "гуанзны нэг порц хоол", title: "Гуанзны хоол, 1 порц", unit: "" },
  firewood: { caption: "1 шуудай түлшний мод", say: "нэг шуудай түлшний мод", title: "Түлшний мод, 1 шуудай", unit: "" },
};

const HOOKS = ["Та мэдэх үү?", "Санаж байна уу?", "Нэг тоо харъя."];

const PCT_CAP = 1000;

function pctText(p: number): string {
  const r = Math.round(p);
  return `${r >= 0 ? "▲" : "▼"} ${formatNumber(Math.min(Math.abs(r), PCT_CAP))}%${Math.abs(r) > PCT_CAP ? "+" : ""}`;
}

const monthDot = (m: string) => m.replace("-", ".");

/**
 * The spec for one good, or null when its series cannot carry a video (no latest price or no
 * price 5+ years back). The oldest of 15/10/5 years back with a price is "then".
 */
export function priceVideoSpec(snap: PricesSnapshot, goodKey: string): VideoSpec | null {
  const good: GoodSeries | undefined = snap.goods.find((g) => g.key === goodKey);
  const names = SPOKEN[goodKey];
  if (!good || !names) return null;
  const latest = snap.latestMonth;
  const nowValue = valueAt(snap.months, good.ub, latest);
  if (nowValue === null || nowValue <= 0) return null;
  const points = agoPoints(snap.months, good.ub, latest);
  const thenPoint = [...points].reverse().find((p) => p.years >= 5 && p.value !== null && p.value > 0);
  if (!thenPoint || thenPoint.value === null) return null;
  const then = thenPoint.value;
  const from = snap.months.indexOf(thenPoint.month);
  const to = snap.months.indexOf(latest);
  if (from < 0 || to <= from) return null;
  const year = points.find((p) => p.years === 1);
  const yearPct = year?.pct ?? null;
  const ratio = nowValue / then;
  const yearsWord = numberWords(thenPoint.years);
  const hook = HOOKS[Math.max(0, Object.keys(SPOKEN).indexOf(goodKey)) % HOOKS.length];

  // The multiple when the price at least doubled, otherwise the percentage (or a fall).
  const pct = Math.round((ratio - 1) * 100);
  const change =
    ratio >= 2
      ? (() => {
          const t = timesPhrase(ratio);
          return { say: `${cap(t.say)} өссөн гэсэн үг.`, caption: `${cap(t.caption.replace(/(\d+)/, "<em>$1</em>"))} өссөн гэсэн үг.` };
        })()
      : pct >= 0
        ? { say: `${cap(numberWords(pct))} хувиар өссөн гэсэн үг.`, caption: `<em>${pct}%</em>-иар өссөн гэсэн үг.` }
        : { say: `${cap(numberWords(-pct))} хувиар буурсан гэсэн үг.`, caption: `<em>${-pct}%</em>-иар буурсан гэсэн үг.` };

  const yearRound = yearPct === null ? null : Math.round(yearPct);
  const yearLine =
    yearRound === null
      ? null
      : yearRound >= 1
        ? { say: `Зөвхөн сүүлийн нэг жилд гэхэд ${numberWords(yearRound)} хувиар үнэтэй болсон.`, caption: `Зөвхөн сүүлийн нэг жилд <span class="nw"><em>${yearRound}%</em>-иар</span> үнэтэй болсон.` }
        : yearRound <= -1
          ? { say: `Сүүлийн нэг жилд ${numberWords(-yearRound)} хувиар хямдарсан.`, caption: `Сүүлийн нэг жилд <span class="nw"><em>${-yearRound}%</em>-иар</span> хямдарсан.` }
          : { say: "Сүүлийн нэг жилд бараг өөрчлөгдөөгүй.", caption: "Сүүлийн нэг жилд бараг өөрчлөгдөөгүй." };

  const sentences: Sentence[] = [
    { say: hook, caption: hook },
    {
      say: `${cap(yearsWord)} жилийн өмнө Улаанбаатарт ${names.say} ${numberWords(then)} төгрөг байсан.`,
      caption: `${thenPoint.years} жилийн өмнө Улаанбаатарт ${names.caption} <em>${formatNumber(then)}₮</em> байсан.`,
    },
    { say: `Одоо? ${cap(numberWords(nowValue))} төгрөг.`, caption: `Одоо? <em>${formatNumber(nowValue)}₮</em>.`, sweep: true },
    { ...change, panel: "ratio" },
    ...(yearLine ? [{ ...yearLine, panel: "tiles" as const }] : []),
    { say: "Эх сурвалж нь Үндэсний статистикийн хороо.", caption: "Эх сурвалж: Үндэсний статистикийн хороо.", panel: "tiles" },
    { say: "Дэлгэрэнгүйг ил тод мэдээ цэг эм эн дээрээс үзээрэй.", caption: "Дэлгэрэнгүйг <em>iltodmedee.mn</em> дээрээс.", panel: "link" },
  ];

  return {
    key: `prices:${goodKey}:${latest}`,
    goodKey,
    kicker: `Үнэ · ${thenPoint.years} жилийн өмнө`,
    title: names.title,
    sub: ["Улаанбаатар", names.unit, "сарын дундаж үнэ"].filter(Boolean).join(" · "),
    months: snap.months,
    series: good.ub,
    from,
    to,
    ratioChip: `×${ratio.toFixed(1)}`,
    ratioNote: `${monthDot(thenPoint.month)} → ${monthDot(latest)} · нэрлэсэн үнэ`,
    tiles: points
      .filter((p) => p.value !== null && p.pct !== null)
      .map((p) => ({ label: `${p.years} жилийн өмнө`, value: formatNumber(p.value!), pct: pctText(p.pct!) })),
    sentences,
    source: "Эх сурвалж: ҮСХ · 1212.mn · DT_NSO_0600_019V1 · Дуу: AI",
    link: `iltodmedee.mn/prices#${goodKey}`,
    then: { month: thenPoint.month, value: then, years: thenPoint.years },
    now: { month: latest, value: nowValue },
    yearPct: yearRound,
  };
}

function cap(s: string): string {
  return s.charAt(0).toLocaleUpperCase("mn") + s.slice(1);
}

/** The narration as one text for the voice (sentences in order). */
export function narration(spec: VideoSpec): string {
  return spec.sentences.map((s) => s.say).join(" ");
}

/**
 * Refuses a spec that could put a wrong number on screen or in the voice: the narration must hold
 * no digit, and every number in the captions and tiles must be one the spec computed from the
 * snapshot. Returns the problems (empty = fine).
 */
export function verifySpec(spec: VideoSpec): string[] {
  const problems: string[] = [];
  for (const s of spec.sentences) if (/\d/.test(s.say)) problems.push(`digits in the narration: ${s.say}`);
  const allowed = new Set<string>([
    String(spec.then.years),
    formatNumber(spec.then.value),
    formatNumber(spec.now.value),
    "1",
    ...(spec.yearPct !== null ? [String(Math.abs(spec.yearPct))] : []),
  ]);
  const ratio = spec.now.value / spec.then.value;
  allowed.add(String(Math.floor(ratio)));
  allowed.add(String(Math.floor(ratio) + 1));
  allowed.add(String(Math.abs(Math.round((ratio - 1) * 100))));
  for (const s of spec.sentences) {
    // Our caption markup (<em>, <span class="nw">) holds no digits, so the numbers are read as they stand.
    const text = s.caption;
    for (const m of text.matchAll(/\d[\d ]*\d|\d/g)) {
      const n = m[0].trim();
      // "1 кг", "1 л", "А-92": the unit and the grade, not a price.
      if (n === "92") continue;
      if (!allowed.has(n)) problems.push(`caption number ${n} is not from the snapshot: ${text}`);
    }
  }
  if (spec.series[spec.from] !== spec.then.value || spec.series[spec.to] !== spec.now.value) problems.push("chart end points differ from the captions");
  return problems;
}
