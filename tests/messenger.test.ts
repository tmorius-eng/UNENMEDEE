import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";

import { classify, digestReply, helpReply, incoming, MAX_TEXT, parseSettings, searchReply, sendText, validSignature } from "@/lib/social/messenger";

describe("messenger bot", () => {
  it("classifies greetings, the digest word and searches", () => {
    assert.deepEqual(classify("Сайн байна уу"), { kind: "help" });
    assert.deepEqual(classify("GET_STARTED"), { kind: "help" });
    assert.deepEqual(classify(""), { kind: "help" });
    assert.deepEqual(classify("тойм"), { kind: "digest" });
    assert.deepEqual(classify("Toim!"), { kind: "digest" });
    assert.deepEqual(classify("  төсвийн   тодотгол "), { kind: "search", q: "төсвийн тодотгол" });
  });

  it("replies only with our own links", () => {
    const d = digestReply({ title: "Өглөөний тойм", items: [{ headline: "А", slug: "a-1" }] });
    const lines = d.split("\n");
    assert.equal(lines[3], "https://iltodmedee.mn/article/a-1");
    assert.equal(lines.at(-1), "Бүтэн тойм: https://iltodmedee.mn/digest");
    assert.equal(digestReply(null), "Одоогоор тойм алга байна. Шинэ мэдээг эндээс: https://iltodmedee.mn");
    const s = searchReply("төсөв", [{ title: "Төсөв батлав", slug: "tusuv", sourceName: "Сангийн яам" }]);
    assert.ok(s.includes("Төсөв батлав (Сангийн яам)\nhttps://iltodmedee.mn/article/tusuv"));
    assert.ok(s.includes("/search?q=%D1%82%D3%A9%D1%81%D3%A9%D0%B2"));
    assert.ok(searchReply("tusuv", []).includes("Кириллээр"));
    assert.ok(helpReply().includes("тойм"));
    const long = digestReply({ title: "x", items: Array.from({ length: 5 }, (_, i) => ({ headline: "ү".repeat(600), slug: `s${i}` })) });
    assert.ok(long.length <= MAX_TEXT);
  });

  it("accepts only bodies signed with the app secret", () => {
    const body = '{"object":"page"}';
    const sig = `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;
    assert.ok(validSignature(body, sig, "secret"));
    assert.ok(!validSignature(body, sig, "other"));
    assert.ok(!validSignature(`${body} `, sig, "secret"));
    assert.ok(!validSignature(body, null, "secret"));
    assert.ok(!validSignature(body, "sha256=zz", "secret"));
  });

  it("reads Messenger and Instagram texts and postbacks, skips echoes and other objects", () => {
    const body = {
      object: "page",
      entry: [
        {
          messaging: [
            { sender: { id: "1" }, message: { text: "тойм" } },
            { sender: { id: "2" }, message: { text: "ours", is_echo: true } },
            { sender: { id: "3" }, postback: { payload: "GET_STARTED" } },
            { sender: { id: "4" }, message: { attachments: [] } },
          ],
        },
      ],
    };
    assert.deepEqual(incoming(body), [
      { channel: "messenger", senderId: "1", text: "тойм" },
      { channel: "messenger", senderId: "3", text: "GET_STARTED" },
      { channel: "messenger", senderId: "4", text: "" },
    ]);
    assert.deepEqual(
      incoming({ object: "instagram", entry: body.entry }).map((m) => m.channel),
      ["instagram", "instagram", "instagram"],
    );
    assert.deepEqual(incoming({ object: "user", entry: body.entry }), []);
  });

  it("parses settings and sends with the token in a header, not the URL", async () => {
    assert.equal(parseSettings('{"pageId":"1"}'), null);
    assert.equal(parseSettings("not json"), null);
    assert.ok(parseSettings('{"pageId":"1","pageToken":"t","appSecret":"s","verifyToken":"v"}'));
    let seen: { url: string; init: RequestInit } | undefined;
    const ok = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;
    await sendText({ pageToken: "SECRET", recipientId: "9", text: "hi", fetchImpl: ok });
    assert.ok(!seen?.url.includes("SECRET"));
    assert.equal((seen?.init.headers as Record<string, string>).authorization, "Bearer SECRET");
    assert.deepEqual(JSON.parse(String(seen?.init.body)), { recipient: { id: "9" }, messaging_type: "RESPONSE", message: { text: "hi" } });
    assert.equal(seen?.url, "https://graph.facebook.com/v26.0/me/messages");
    await sendText({ pageToken: "IG", channel: "instagram", recipientId: "9", text: "hi", fetchImpl: ok });
    assert.equal(seen?.url, "https://graph.instagram.com/v26.0/me/messages");
  });
});
