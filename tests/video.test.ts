import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { geminiModelPrice } from "@/lib/ai/pricing";
import type { JsonStat2 } from "@/lib/budget/jsonstat";
import { GOODS, parsePrices } from "@/lib/budget/prices";
import { publishReel } from "@/lib/social/facebook";
import { publishInstagram } from "@/lib/social/instagram";
import { publishThreads, THREADS_MAX, threadsLength } from "@/lib/social/threads";
import { numberWords, timesPhrase } from "@/lib/video/mn-numbers";
import { facebookVideoText, instagramVideoCaption, threadsVideoText, type VideoMeta } from "@/lib/video/posts";
import { narration, priceVideoSpec, SPOKEN, verifySpec } from "@/lib/video/price-video";
import { sceneHtml } from "@/lib/video/scene-html";
import { parseSilences, plausibleTake, sentenceStarts } from "@/lib/video/timing";
import { pcmToWav, speak } from "@/lib/video/tts";

const snap = parsePrices(JSON.parse(readFileSync("tests/fixtures/budget/nso-prices.json", "utf8")) as JsonStat2, GOODS.filter((g) => ["beef", "petrol", "canteen"].includes(g.key)));

describe("numbers as spoken Mongolian", () => {
  it("reads prices, percentages and years the way a person says them before a unit", () => {
    assert.equal(numberWords(31210), "гучин нэгэн мянга хоёр зуун арван");
    assert.equal(numberWords(4760), "дөрвөн мянга долоон зуун жаран");
    assert.equal(numberWords(50), "тавин");
    assert.equal(numberWords(15), "арван таван");
    assert.equal(numberWords(105), "зуун таван");
    assert.equal(numberWords(1000), "мянган");
    assert.equal(numberWords(4000), "дөрвөн мянган");
    assert.equal(numberWords(1), "нэг");
    assert.equal(numberWords(21), "хорин нэгэн");
    assert.equal(numberWords(3_040), "гурван мянга дөчин");
    assert.equal(numberWords(2_500_000), "хоёр сая таван зуун мянган");
    assert.equal(numberWords(7, "nominative"), "долоо");
    assert.equal(numberWords(20, "nominative"), "хорь");
    assert.throws(() => numberWords(-1));
  });

  it("says a multiple as a person rounds it", () => {
    assert.deepEqual(timesPhrase(6.56), { say: "зургаа гаруй дахин", caption: "6 гаруй дахин" });
    assert.deepEqual(timesPhrase(6.8), { say: "бараг долоо дахин", caption: "бараг 7 дахин" });
    assert.deepEqual(timesPhrase(3.1), { say: "гурав дахин", caption: "3 дахин" });
  });
});

describe("price video spec", () => {
  it("beef: 15 years back, the real numbers, no digit in the voice, verified", () => {
    const spec = priceVideoSpec(snap, "beef")!;
    assert.equal(spec.key, "prices:beef:2026-09");
    assert.deepEqual(spec.then, { month: "2011-09", value: 4760, years: 15 });
    assert.deepEqual(spec.now, { month: "2026-09", value: 31210 });
    assert.equal(spec.yearPct, 50);
    assert.equal(spec.ratioChip, "×6.6");
    assert.deepEqual(verifySpec(spec), []);
    const text = narration(spec);
    assert.ok(!/\d/.test(text));
    assert.ok(text.includes("дөрвөн мянга долоон зуун жаран төгрөг байсан"));
    assert.ok(text.includes("Гучин нэгэн мянга хоёр зуун арван төгрөг"));
    assert.ok(text.includes("тавин хувиар үнэтэй болсон"));
    assert.ok(spec.sentences[1].caption.includes("<em>4 760₮</em>"));
  });

  it("every good has its spoken name; unknown goods make no video", () => {
    for (const g of GOODS) assert.ok(SPOKEN[g.key], g.key);
    assert.equal(priceVideoSpec(snap, "gold"), null);
  });

  it("refuses a caption with a number that is not from the snapshot", () => {
    const spec = priceVideoSpec(snap, "beef")!;
    spec.sentences[2] = { ...spec.sentences[2], caption: "Одоо? <em>32 000₮</em>." };
    assert.match(verifySpec(spec).join(), /32 000/);
    spec.sentences[0] = { ...spec.sentences[0], say: "Одоо 32000 төгрөг" };
    assert.match(verifySpec(spec).join(), /digits in the narration/);
  });

  it("the scene page cannot be broken out of by its data", () => {
    const spec = priceVideoSpec(snap, "beef")!;
    spec.sentences[0] = { ...spec.sentences[0], caption: "</script><script>alert(1)</script>" };
    const html = sceneHtml(spec, [0, 1, 2, 3, 4, 5, 6], { fontsDir: "/f", logo: "/l.png" });
    assert.equal(html.match(/<\/script>/g)?.length, 1);
  });
});

describe("timing", () => {
  const log = [
    "silence_start: 0", "silence_end: 0.2",
    "silence_start: 0.7", "silence_end: 1.12",
    "silence_start: 6.77", "silence_end: 7.25",
    "silence_start: 7.6", "silence_end: 7.98",
    "silence_start: 10.52", "silence_end: 10.86",
    "silence_start: 12.71", "silence_end: 13.5",
    "silence_start: 22.76",
  ].join("\n");

  it("reads ffmpeg's pauses, a trailing one running to the end", () => {
    const s = parseSilences(log, 23.04);
    assert.equal(s.length, 7);
    assert.deepEqual(s.at(-1), { start: 22.76, end: 23.04 });
  });

  it("starts each sentence at the pause nearest its share of the letters", () => {
    const sentences = ["Та мэдэх үү?", "Арван таван жилийн өмнө Улаанбаатарт нэг кило үхрийн мах дөрвөн мянга долоон зуун жаран төгрөг байсан.", "Одоо?", "Гучин нэгэн мянга хоёр зуун арван төгрөг."];
    const starts = sentenceStarts(sentences, parseSilences(log, 23.04), 23.04);
    assert.equal(starts[0], 0);
    assert.equal(starts[1], 1.12);
    for (let i = 1; i < starts.length; i++) assert.ok(starts[i] > starts[i - 1]);
  });

  it("refuses a take that is far too fast or slow for its text", () => {
    assert.ok(plausibleTake("а".repeat(270), 22));
    assert.ok(!plausibleTake("а".repeat(270), 5));
    assert.ok(!plausibleTake("а".repeat(270), 60));
  });
});

describe("narration voice", () => {
  const guard = (ok: boolean) => ({ check: async () => (ok ? { ok: true as const } : { ok: false as const, reason: "daily AI budget $0.3 reached" }), record: () => {} });

  it("passes the budget guard first and logs the call with its cost", async () => {
    const logged: { purpose: string; estimatedCostUsd: number; success: boolean }[] = [];
    const pcm = Buffer.alloc(4800);
    const wav = await speak({
      text: "Та мэдэх үү?",
      apiKey: "k",
      guard: guard(true),
      log: async (r) => void logged.push(r),
      fetchImpl: (async () =>
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "audio/L16;codec=pcm;rate=24000", data: pcm.toString("base64") } }] } }], usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 500 } }))) as typeof fetch,
    });
    assert.equal(wav.subarray(0, 4).toString(), "RIFF");
    assert.equal(logged.length, 1);
    assert.equal(logged[0].purpose, "video");
    assert.ok(logged[0].success);
    // $0.50 in + $9.00 out per 1M tokens through 2026.
    assert.ok(Math.abs(logged[0].estimatedCostUsd - (300 * 0.5 + 500 * 9) / 1e6) < 1e-9 || logged[0].estimatedCostUsd === 0);
  });

  it("never calls the API when the budget is spent", async () => {
    let called = false;
    await assert.rejects(
      speak({ text: "x", apiKey: "k", guard: guard(false), log: async () => {}, fetchImpl: (async () => ((called = true), new Response("{}"))) as typeof fetch }),
      /budget/,
    );
    assert.equal(called, false);
  });

  it("prices the speech model by date", () => {
    assert.deepEqual(geminiModelPrice("gemini-3.8-flash-tts", new Date("2026-10-30")), { input: 0.5, output: 9 });
    assert.deepEqual(geminiModelPrice("gemini-3.8-flash-tts", new Date("2027-01-02")), { input: 1, output: 18 });
    assert.equal(pcmToWav(Buffer.alloc(10)).length, 54);
  });
});

const meta: VideoMeta = { kind: "prices", goodKey: "beef", title: "Үхрийн мах, 1 кг", then: { month: "2011-09", value: 4760, years: 15 }, now: { month: "2026-09", value: 31210 }, yearPct: 50, link: "iltodmedee.mn/prices#beef" };

describe("video posts", () => {
  it("say the same numbers as the video, with the source and the link", () => {
    const fb = facebookVideoText(meta);
    assert.ok(fb.startsWith("🛒 Үхрийн мах, 1 кг: 15 жилийн өмнө 4 760₮ → одоо 31 210₮\n📈 Сүүлийн 1 жилд ▲ 50%"));
    assert.ok(fb.includes("https://iltodmedee.mn/prices#beef"));
    assert.ok(fb.includes("Үндэсний статистикийн хороо"));
    assert.ok(instagramVideoCaption(meta).includes("холбоос bio-д"));
    const th = threadsVideoText(meta);
    assert.ok(threadsLength(th) <= THREADS_MAX);
    assert.ok(th.endsWith("#үнэ"));
  });
});

type Call = { url: string; init?: RequestInit };
const recorder = (answers: ((url: string) => unknown)[]) => {
  const calls: Call[] = [];
  let i = 0;
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const body = answers[Math.min(i++, answers.length - 1)](url);
    return new Response(JSON.stringify(body), { status: 200 });
  }) as unknown as typeof fetch;
  return { calls, f };
};
const noSleep = async () => {};

describe("publishing a video", () => {
  it("Facebook: Reels start → hosted upload → finish, token never in a URL", async () => {
    const { calls, f } = recorder([() => ({ video_id: "77" }), () => ({ success: true }), () => ({ success: true }), () => ({ status: { video_status: "ready" } })]);
    const id = await publishReel({ pageId: "p1", token: "SECRET", videoUrl: "https://iltodmedee.mn/reel?v=3", description: "d", fetchImpl: f, sleep: noSleep });
    assert.equal(id, "77");
    assert.match(calls[1].url, /^https:\/\/rupload\.facebook\.com\/video-upload\/v\d+\.\d\/77$/);
    assert.equal((calls[1].init?.headers as Record<string, string>).file_url, "https://iltodmedee.mn/reel?v=3");
    assert.equal(new URLSearchParams(String(calls[2].init?.body)).get("video_state"), "PUBLISHED");
    assert.ok(calls.every((c) => !c.url.includes("SECRET")));
  });

  it("Instagram: a REELS container with the video URL, shared to the feed", async () => {
    const { calls, f } = recorder([() => ({ id: "c1" }), () => ({ status_code: "IN_PROGRESS" }), () => ({ status_code: "FINISHED" }), () => ({ id: "m1" })]);
    const id = await publishInstagram({ token: "t", post: { videoUrl: "https://iltodmedee.mn/reel?v=3", caption: "c" }, fetchImpl: f, sleep: noSleep });
    assert.equal(id, "m1");
    const body = new URLSearchParams(String(calls[0].init?.body));
    assert.equal(body.get("media_type"), "REELS");
    assert.equal(body.get("video_url"), "https://iltodmedee.mn/reel?v=3");
    assert.equal(body.get("share_to_feed"), "true");
    assert.equal(body.get("image_url"), null);
  });

  it("Threads: a VIDEO container with the text", async () => {
    const { calls, f } = recorder([() => ({ id: "c1" }), () => ({ status: "FINISHED" }), () => ({ id: "t1" })]);
    const id = await publishThreads({ token: "t", post: { text: "x", link: "l", videoUrl: "https://iltodmedee.mn/reel?v=3" }, fetchImpl: f, sleep: noSleep });
    assert.equal(id, "t1");
    const body = new URLSearchParams(String(calls[0].init?.body));
    assert.equal(body.get("media_type"), "VIDEO");
    assert.equal(body.get("video_url"), "https://iltodmedee.mn/reel?v=3");
  });
});
