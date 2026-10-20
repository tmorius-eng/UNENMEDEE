import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { articlePayload, clip, digestPayload, isAllowedPushEndpoint, moreNewsPayload, SubscriptionSchema } from "@/lib/push/core";

describe("push subscriptions", () => {
  it("accepts only browser push services over https", () => {
    assert.ok(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc"));
    assert.ok(isAllowedPushEndpoint("https://web.push.apple.com/QGx..."));
    assert.ok(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x"));
    assert.ok(isAllowedPushEndpoint("https://wns2-db5p.notify.windows.com/w/?token=x"));
    assert.equal(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc"), false, "plain http");
    assert.equal(isAllowedPushEndpoint("https://evil.example.com/fcm.googleapis.com"), false, "other host");
    assert.equal(isAllowedPushEndpoint("https://fcm.googleapis.com.evil.com/x"), false, "suffix trick");
    assert.equal(isAllowedPushEndpoint("not a url"), false);
  });

  it("validates the subscription JSON a browser sends", () => {
    const ok = SubscriptionSchema.safeParse({ endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "B".repeat(87), auth: "a".repeat(22) } });
    assert.ok(ok.success);
    assert.equal(SubscriptionSchema.safeParse({ endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "short", auth: "x" } }).success, false);
  });
});

describe("push payloads", () => {
  const article = { id: 7, slug: "tosov-2027", title: "УИХ 2027 оны төсвийг баталлаа", tldr: "Нийт зарлага 32.4 их наяд төгрөг.\nХоёр дахь өгүүлбэр.", sourceName: "УИХ", riskFlag: false };

  it("uses the first TL;DR sentence and links to the article", () => {
    const p = articlePayload(article);
    assert.equal(p.title, "📰 УИХ 2027 оны төсвийг баталлаа");
    assert.equal(p.body, "Нийт зарлага 32.4 их наяд төгрөг. · УИХ");
    assert.equal(p.url, "/article/tosov-2027");
    assert.equal(articlePayload({ ...article, riskFlag: true }).title.startsWith("🚨"), true);
  });

  it("keeps notifications short", () => {
    assert.equal(clip("а".repeat(200), 20).length, 20);
    assert.ok(clip("а".repeat(200), 20).endsWith("…"));
    assert.equal(clip("  богино   текст ", 20), "богино текст");
  });

  it("builds digest and overflow notifications", () => {
    assert.equal(digestPayload({ title: "Төсөв", intro: "Товч", kind: "12h" }).url, "/digest");
    assert.match(moreNewsPayload(5).title, /5 чухал мэдээ/);
  });
});
