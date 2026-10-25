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
  it("digest: hook first (top story + why it matters), four more, the link, our card", () => {
    const p = digestPost({ ...digest, items: digest.items.map((it, i) => ({ ...it, whyItMatters: i === 0 ? "Учир нь чухал." : undefined })) });
    const lines = p.message.split("\n");
    assert.equal(lines[0], "🗞 ОРОЙН ТОЙМ · 22:48");
    assert.equal(lines[2], "⚡ Мэдээ 1");
    assert.equal(lines[3], "👉 Учир нь чухал.");
    assert.ok(lines.includes("• Мэдээ 5"));
    assert.ok(!lines.includes("• Мэдээ 6"));
    assert.ok(lines.includes("Бүх 7 мэдээ, эх сурвалжтай нь 👉 https://iltodmedee.mn/digest"));
    assert.equal(p.imageUrl, "https://iltodmedee.mn/ig-image?d=9");
  });

  it("article: headline hook, two summary sentences, amount, source, link, card", () => {
    const p = articlePost({
      id: 1,
      slug: "tusuv-123",
      title: "Төсвийн тодотгол",
      tldr: "Нэгдүгээр өгүүлбэр.\nХоёрдугаар өгүүлбэр.\nГуравдугаар өгүүлбэр.",
      sourceName: "Сангийн яам",
      amounts: ["5 сая ₮", "1.2 их наяд ₮"],
      riskFlag: false,
    });
    const lines = p.message.split("\n");
    assert.equal(lines[0], "⚡ Төсвийн тодотгол");
    assert.equal(lines[2], "👉 Нэгдүгээр өгүүлбэр. Хоёрдугаар өгүүлбэр.");
    assert.equal(lines[3], "💰 Дүн: 1.2 их наяд ₮");
    assert.equal(lines[4], "🏛 Эх сурвалж: Сангийн яам");
    assert.ok(lines.includes("Дэлгэрэнгүй, эх баримтын холбоос 👉 https://iltodmedee.mn/article/tusuv-123"));
    assert.equal(p.imageUrl, "https://iltodmedee.mn/ig-image?a=tusuv-123");
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
    await publishToPage({ pageId: "123", token: "SECRET", post: { message: "x", link: "l", imageUrl: "https://iltodmedee.mn/ig-image?d=1" }, fetchImpl: ok, version: "v26.0" });
    const photo = seen as { url: string; body: string } | undefined;
    assert.equal(photo?.url, "https://graph.facebook.com/v26.0/123/photos");
    assert.equal(new URLSearchParams(photo?.body).get("caption"), "x");
    assert.ok(!photo?.url.includes("SECRET"));
    assert.ok(photo?.body.includes("access_token=SECRET"));

    const expired = (async () => new Response(JSON.stringify({ error: { message: "Session has expired", code: 190 } }), { status: 400 })) as unknown as typeof fetch;
    const err = await publishToPage({ pageId: "123", token: "SECRET", post: { message: "x", link: "y" }, fetchImpl: expired }).catch((e) => e);
    assert.ok(err instanceof FacebookError);
    assert.equal(err.code, 190);
    assert.ok(err.hint.includes("expired"));
    assert.ok(!err.message.includes("SECRET"));
  });
});
