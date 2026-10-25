import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CAPTION_MAX, instagramArticlePost, instagramDigestPost, publishInstagram } from "@/lib/social/instagram";

describe("instagram posts", () => {
  it("digest: our JPEG card, every headline and the bio hint in the caption", () => {
    const p = instagramDigestPost({ id: 10, kind: "12h", title: "Тойм", intro: "Оршил", periodEnd: "2026-10-24T23:05:00Z", items: [{ headline: "Нэг" }, { headline: "Хоёр" }] });
    assert.equal(p.imageUrl, "https://iltodmedee.mn/ig-image?d=10");
    assert.ok(p.caption.startsWith("🗞 ӨГЛӨӨНИЙ ТОЙМ · 07:05\nТойм\n\nОршил\n\n1. Нэг\n2. Хоёр"));
    assert.ok(p.caption.includes("холбоос bio-д"));
    assert.ok(p.caption.endsWith("#ИлТодМэдээ #Монгол #мэдээ #төр"));
  });

  it("article: card by slug, summary, amount, source; caption capped", () => {
    const p = instagramArticlePost({ id: 1, slug: "a-b", title: "Т", tldr: "Нэг.\nХоёр.", sourceName: "Яам", amounts: ["3 сая ₮"], riskFlag: true });
    assert.equal(p.imageUrl, "https://iltodmedee.mn/ig-image?a=a-b");
    assert.ok(p.caption.includes("💰 3 сая ₮\n🚨"));
    assert.ok(p.caption.includes("🏛 Эх сурвалж: Яам"));
    const long = instagramArticlePost({ id: 1, slug: "s", title: "ү".repeat(3000), tldr: "", sourceName: "Я", amounts: [], riskFlag: false });
    assert.equal(long.caption.length, CAPTION_MAX);
  });

  it("creates, waits for FINISHED, publishes; the token stays out of errors", async () => {
    const calls: string[] = [];
    let polls = 0;
    const f = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url.split("?")[0]}`);
      if (url.endsWith("/17841/media")) {
        assert.equal(new URLSearchParams(String(init?.body)).get("image_url"), "https://iltodmedee.mn/ig-image?d=1");
        return Response.json({ id: "c1" });
      }
      if (url.includes("/c1?")) return Response.json({ status_code: ++polls < 2 ? "IN_PROGRESS" : "FINISHED" });
      return Response.json({ id: "m1" });
    }) as unknown as typeof fetch;
    const id = await publishInstagram({ igUserId: "17841", token: "SECRET", post: { imageUrl: "https://iltodmedee.mn/ig-image?d=1", caption: "x" }, fetchImpl: f, sleep: async () => {} });
    assert.equal(id, "m1");
    assert.deepEqual(calls, [
      "POST https://graph.facebook.com/v26.0/17841/media",
      "GET https://graph.facebook.com/v26.0/c1",
      "GET https://graph.facebook.com/v26.0/c1",
      "POST https://graph.facebook.com/v26.0/17841/media_publish",
    ]);
    const bad = (async () => Response.json({ error: { message: "Invalid OAuth access token", code: 190 } }, { status: 400 })) as unknown as typeof fetch;
    const err = await publishInstagram({ igUserId: "17841", token: "SECRET", post: { imageUrl: "u", caption: "c" }, fetchImpl: bad }).catch((e: Error) => e);
    assert.ok(err instanceof Error && err.message.includes("code 190") && !err.message.includes("SECRET"));
  });
});
