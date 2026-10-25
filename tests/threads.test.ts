import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { currentState, needsRefresh, publishThreads, seedOf, THREADS_MAX, threadsArticlePost, threadsDigestPost, threadsLength } from "@/lib/social/threads";

const digest = {
  id: 1,
  kind: "12h",
  title: "Төсөв, эрчим хүч",
  intro: "",
  periodEnd: "2026-10-24T23:05:00Z", // 07:05 Ulaanbaatar
  items: Array.from({ length: 6 }, (_, i) => ({ headline: `Гарчиг ${i + 1} ${"ү".repeat(100)}` })),
};

describe("threads posts", () => {
  it("counts emoji as their UTF-8 bytes and Cyrillic as one", () => {
    assert.equal(threadsLength("өгүүлбэр"), 8);
    assert.equal(threadsLength("🗞"), 4);
  });

  it("digest fits 500 characters by dropping headlines, keeps the label and link", () => {
    const p = threadsDigestPost(digest);
    assert.ok(threadsLength(p.text) <= THREADS_MAX);
    assert.ok(p.text.startsWith("🗞 ӨГЛӨӨНИЙ ТОЙМ · 07:05\nТөсөв, эрчим хүч"));
    assert.ok(p.text.endsWith("#ИлТодМэдээ"));
    assert.ok(!p.text.includes("Гарчиг 5"));
    assert.equal(p.link, "https://iltodmedee.mn/digest");
  });

  it("article: first summary sentence, largest amount, source", () => {
    const p = threadsArticlePost({ id: 1, slug: "s", title: "Т", tldr: "Нэг.\nХоёр.", sourceName: "Яам", amounts: ["2 тэрбум ₮", "5 сая ₮"], riskFlag: false });
    assert.equal(p.text, "📰 Т\n\nНэг.\n\n💰 2 тэрбум ₮\n🏛 Яам");
    assert.equal(p.link, "https://iltodmedee.mn/article/s");
  });

  it("a new THREADS_TOKEN secret replaces the stored token; refresh after 7 days", () => {
    const now = new Date("2026-10-25T00:00:00Z");
    const stored = { token: "old", refreshedAt: "2026-10-20T00:00:00Z", seed: seedOf("seed1") };
    assert.equal(currentState(stored, "seed1", now), stored);
    assert.equal(currentState(stored, undefined, now), stored);
    assert.equal(currentState(stored, "seed2", now)?.token, "seed2");
    assert.equal(currentState(null, undefined, now), null);
    assert.ok(!needsRefresh(stored, now));
    assert.ok(needsRefresh(stored, new Date("2026-10-28T00:00:01Z")));
  });

  it("creates, waits for FINISHED, publishes; errors never carry the token", async () => {
    const calls: string[] = [];
    let polls = 0;
    const f = (async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url.split("?")[0]}`);
      if (url.endsWith("/me/threads")) {
        assert.equal(new URLSearchParams(String(init?.body)).get("link_attachment"), "https://iltodmedee.mn/digest");
        return Response.json({ id: "c1" });
      }
      if (url.includes("/c1?")) return Response.json({ status: ++polls < 2 ? "IN_PROGRESS" : "FINISHED" });
      return Response.json({ id: "p1" });
    }) as unknown as typeof fetch;
    const id = await publishThreads({ token: "SECRET", post: { text: "x", link: "https://iltodmedee.mn/digest" }, fetchImpl: f, sleep: async () => {} });
    assert.equal(id, "p1");
    assert.deepEqual(calls, [
      "POST https://graph.threads.com/v1.0/me/threads",
      "GET https://graph.threads.com/v1.0/c1",
      "GET https://graph.threads.com/v1.0/c1",
      "POST https://graph.threads.com/v1.0/me/threads_publish",
    ]);
    const bad = (async () => Response.json({ error: { message: "Invalid OAuth access token", code: 190 } }, { status: 400 })) as unknown as typeof fetch;
    const err = await publishThreads({ token: "SECRET", post: { text: "x", link: "y" }, fetchImpl: bad }).catch((e: Error) => e);
    assert.ok(err instanceof Error && err.message.includes("code 190") && !err.message.includes("SECRET"));
  });
});
