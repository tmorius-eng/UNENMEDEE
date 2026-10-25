import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CAPTION_MAX, instagramArticlePost, instagramDigestPost, publishInstagram } from "@/lib/social/instagram";
import { outcomeUnknown } from "@/lib/social/outcome";
import { cut, publishThreads, threadsLength } from "@/lib/social/threads";

describe("instagram posts", () => {
  it("digest: our JPEG card, every headline and the bio hint in the caption", () => {
    const p = instagramDigestPost({ id: 10, kind: "12h", title: "Тойм", intro: "Оршил", periodEnd: "2026-10-24T23:05:00Z", items: [{ headline: "Нэг", whyItMatters: "Учир." }, { headline: "Хоёр" }] });
    assert.equal(p.imageUrl, "https://iltodmedee.mn/ig-image?d=10");
    assert.ok(p.caption.startsWith("🗞 ӨГЛӨӨНИЙ ТОЙМ · 07:05\n\n⚡ Нэг\n👉 Учир.\n\nМөн өнөөдөр:\n• Хоёр"));
    assert.ok(p.caption.includes("холбоос bio-д"));
    assert.ok(p.caption.endsWith("#ИлТодМэдээ #мэдээ #Монгол #Mongolia #mongolianews #Улаанбаатар #шинэмэдээ"));
  });

  it("article: card by slug, summary, amount, source; caption capped", () => {
    const p = instagramArticlePost({ id: 1, slug: "a-b", title: "Т", tldr: "Нэг.\nХоёр.", sourceName: "Яам", amounts: ["3 сая ₮"], riskFlag: true });
    assert.equal(p.imageUrl, "https://iltodmedee.mn/ig-image?a=a-b");
    assert.ok(p.caption.startsWith("🚨 Т\n\n👉 Нэг. Хоёр.\n💰 Дүн: 3 сая ₮\n⚠️"));
    assert.ok(p.caption.includes("🏛 Эх сурвалж: Яам"));
    const long = instagramArticlePost({ id: 1, slug: "s", title: "ү".repeat(3000), tldr: "", sourceName: "Я", amounts: [], riskFlag: false });
    assert.equal(long.caption.length, CAPTION_MAX);
  });

  it("creates, waits for FINISHED, publishes; the token stays out of errors", async () => {
    const calls: string[] = [];
    let polls = 0;
    const f = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url.split("?")[0]}`);
      if (url.endsWith("/me/media")) {
        assert.equal(new URLSearchParams(String(init?.body)).get("image_url"), "https://iltodmedee.mn/ig-image?d=1");
        return Response.json({ id: "c1" });
      }
      if (url.includes("/c1?")) return Response.json({ status_code: ++polls < 2 ? "IN_PROGRESS" : "FINISHED" });
      return Response.json({ id: "m1" });
    }) as unknown as typeof fetch;
    const id = await publishInstagram({ token: "SECRET", post: { imageUrl: "https://iltodmedee.mn/ig-image?d=1", caption: "x" }, fetchImpl: f, sleep: async () => {} });
    assert.equal(id, "m1");
    assert.deepEqual(calls, [
      "POST https://graph.instagram.com/v26.0/me/media",
      "GET https://graph.instagram.com/v26.0/c1",
      "GET https://graph.instagram.com/v26.0/c1",
      "POST https://graph.instagram.com/v26.0/me/media_publish",
    ]);
    const bad = (async () => Response.json({ error: { message: "Invalid OAuth access token", code: 190 } }, { status: 400 })) as unknown as typeof fetch;
    const err = await publishInstagram({ token: "SECRET", post: { imageUrl: "u", caption: "c" }, fetchImpl: bad }).catch((e: Error) => e);
    assert.ok(err instanceof Error && err.message.includes("code 190") && !err.message.includes("SECRET"));
  });
});

describe("social publishing safety", () => {
  it("never publishes a container that stays IN_PROGRESS", async () => {
    const calls: string[] = [];
    const f = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url.split("?")[0]}`);
      if (url.endsWith("/me/media") || url.endsWith("/me/threads")) return Response.json({ id: "c1" });
      if (url.includes("/c1?")) return Response.json({ status_code: "IN_PROGRESS", status: "IN_PROGRESS" });
      return Response.json({ id: "m1" });
    }) as unknown as typeof fetch;
    const ig = await publishInstagram({ token: "T", post: { imageUrl: "u", caption: "c" }, fetchImpl: f, sleep: async () => {} }).catch((e: Error) => e);
    assert.ok(ig instanceof Error && /not finished/.test(ig.message));
    const th = await publishThreads({ token: "T", post: { text: "x", link: "l", imageUrl: "u" }, fetchImpl: f, sleep: async () => {} }).catch((e: Error) => e);
    assert.ok(th instanceof Error && /not finished/.test(th.message));
    assert.ok(!calls.some((c) => c.includes("publish")), calls.join("\n"));
  });

  it("treats timeouts and dropped connections as 'may have posted'", () => {
    assert.equal(outcomeUnknown(new DOMException("t", "TimeoutError")), true);
    assert.equal(outcomeUnknown(Object.assign(new TypeError("fetch failed"), { cause: { code: "UND_ERR_SOCKET" } })), true);
    assert.equal(outcomeUnknown(new Error("Instagram 400: Invalid OAuth access token")), false);
  });

  it("cuts Threads text at whole emoji and counts the emoji variation selector", () => {
    assert.equal(threadsLength("⚖️"), threadsLength("⚖") + 3);
    const out = cut("ab😀😀😀", 6);
    assert.ok(!/[\uD800-\uDBFF]…$/.test(out), JSON.stringify(out));
    assert.ok(threadsLength(out) <= 6);
  });
});
