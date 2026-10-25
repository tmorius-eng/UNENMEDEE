import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { articlePost, digestPost, FacebookError, publishToPage } from "@/lib/social/facebook";

const digest = {
  id: 9,
  kind: "12h",
  title: "Төсөв, эрчим хүч, хууль",
  intro: "Өнөөдрийн гол мэдээ.",
  periodEnd: "2026-10-24T14:48:00Z", // 22:48 Ulaanbaatar
  items: Array.from({ length: 7 }, (_, i) => ({ headline: `Мэдээ ${i + 1}` })),
};

describe("facebook posts", () => {
  it("digest: edition label, five headlines, the rest counted, link to /digest", () => {
    const p = digestPost(digest);
    assert.ok(p.message.startsWith("🗞 ОРОЙН ТОЙМ · 22:48\nТөсөв, эрчим хүч, хууль"));
    assert.ok(p.message.includes("5. Мэдээ 5"));
    assert.ok(!p.message.includes("Мэдээ 6"));
    assert.ok(p.message.includes("өөр 2 мэдээ"));
    assert.equal(p.link, "https://iltodmedee.mn/digest");
  });

  it("article: two summary sentences, the largest amount, the source, never localhost", () => {
    const p = articlePost({
      id: 1,
      slug: "tusuv-123",
      title: "Төсвийн тодотгол",
      tldr: "Нэгдүгээр өгүүлбэр.\nХоёрдугаар өгүүлбэр.\nГуравдугаар өгүүлбэр.",
      sourceName: "Сангийн яам",
      amounts: ["5 сая ₮", "1.2 их наяд ₮"],
      riskFlag: false,
    });
    assert.ok(p.message.includes("Хоёрдугаар өгүүлбэр."));
    assert.ok(!p.message.includes("Гуравдугаар"));
    assert.ok(p.message.includes("💰 1.2 их наяд ₮"));
    assert.ok(p.message.includes("🏛 Эх сурвалж: Сангийн яам"));
    assert.ok(!p.message.includes("🚨"));
    assert.equal(p.link, "https://iltodmedee.mn/article/tusuv-123");
  });

  it("publish: token only in the POST body; Graph errors keep their code", async () => {
    let seen: { url: string; body: string } | undefined;
    const ok = (async (url: string, init: RequestInit) => {
      seen = { url, body: String(init.body) };
      return new Response(JSON.stringify({ id: "123_456" }), { status: 200 });
    }) as unknown as typeof fetch;
    const id = await publishToPage({ pageId: "123", token: "SECRET", post: { message: "x", link: "https://iltodmedee.mn/" }, fetchImpl: ok, version: "v26.0" });
    assert.equal(id, "123_456");
    assert.equal(seen?.url, "https://graph.facebook.com/v26.0/123/feed");
    assert.ok(!seen?.url.includes("SECRET"));
    assert.ok(seen?.body.includes("access_token=SECRET"));

    const expired = (async () => new Response(JSON.stringify({ error: { message: "Session has expired", code: 190 } }), { status: 400 })) as unknown as typeof fetch;
    const err = await publishToPage({ pageId: "123", token: "SECRET", post: { message: "x", link: "y" }, fetchImpl: expired }).catch((e) => e);
    assert.ok(err instanceof FacebookError);
    assert.equal(err.code, 190);
    assert.ok(err.hint.includes("expired"));
    assert.ok(!err.message.includes("SECRET"));
  });
});
