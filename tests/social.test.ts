import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { articlePost, digestPost, FacebookError, publishToPage, resolveFacebookPage } from "@/lib/social/facebook";
import { publishTelegram, telegramArticlePost } from "@/lib/social/telegram";

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

describe("facebook page token", () => {
  const graph = (routes: Record<string, unknown>, seen: string[] = []) =>
    (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      seen.push(`${u} ${JSON.stringify(init?.headers ?? {})}`);
      const key = Object.keys(routes).find((k) => u.includes(k));
      return new Response(JSON.stringify(key ? routes[key] : { error: { message: "unknown" } }), { status: 200 });
    }) as typeof fetch;

  it("a Page token is used as is (no accounts edge on a Page)", async () => {
    const f = graph({ "/me/accounts": { error: { message: "(#100) Tried accessing nonexisting field (accounts)" } }, "/me?fields=id": { id: "PAGE1" } });
    assert.deepEqual(await resolveFacebookPage({ token: "PT", fetchImpl: f }), { pageId: "PAGE1", token: "PT", fromUserToken: false });
  });

  it("a user token is swapped for the Page token of its only Page, or the one FB_PAGE_ID names", async () => {
    const seen: string[] = [];
    const one = graph({ "/me/accounts": { data: [{ id: "P9", access_token: "PAGE-TOKEN" }] } }, seen);
    assert.deepEqual(await resolveFacebookPage({ token: "USER", fetchImpl: one }), { pageId: "P9", token: "PAGE-TOKEN", fromUserToken: true });
    assert.ok(seen.every((s) => !s.split(" ")[0].includes("USER")), "the token never goes in a URL");
    const two = graph({ "/me/accounts": { data: [{ id: "A", access_token: "TA" }, { id: "B", access_token: "TB" }] } });
    assert.deepEqual(await resolveFacebookPage({ token: "USER", pageId: "B", fetchImpl: two }), { pageId: "B", token: "TB", fromUserToken: true });
    const r = await resolveFacebookPage({ token: "USER", fetchImpl: two });
    assert.ok("error" in r && r.error.includes("set FB_PAGE_ID"));
  });

  it("a user token without Pages is an error, not a post to the person's profile", async () => {
    const r = await resolveFacebookPage({ token: "USER", fetchImpl: graph({ "/me/accounts": { data: [] } }) });
    assert.ok("error" in r && r.error.includes("user token"));
  });
});

describe("telegram channel", () => {
  const story = { id: 1, slug: "a-b", title: "Гарчиг", tldr: "Нэг. Хоёр.", sourceName: "Сангийн яам", amounts: ["48.5 тэрбум ₮"], riskFlag: false, topic: "economy" };

  it("posts our card with the Facebook text as caption, cut to Telegram's 1024", async () => {
    const calls: { url: string; body: Record<string, unknown> }[] = [];
    const f = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }));
    }) as typeof fetch;
    const post = telegramArticlePost(story);
    const id = await publishTelegram({ token: "123:SECRET", chatId: "@iltodmedee", post: { ...post, text: "ж".repeat(3000) }, fetchImpl: f });
    assert.equal(id, "42");
    assert.ok(calls[0].url.endsWith("/sendPhoto"));
    assert.equal(calls[0].body.photo, "https://iltodmedee.mn/ig-image?a=a-b");
    assert.ok(String(calls[0].body.caption).length <= 1024);
  });

  it("never echoes the token in an error", async () => {
    const f = (async () => new Response(JSON.stringify({ ok: false, description: "Unauthorized: bot123:SECRET" }), { status: 401 })) as unknown as typeof fetch;
    await assert.rejects(publishTelegram({ token: "123:SECRET", chatId: "@x", post: { text: "t", link: "l" }, fetchImpl: f }), (e: Error) => !e.message.includes("SECRET") && e.message.includes("401"));
  });
});
