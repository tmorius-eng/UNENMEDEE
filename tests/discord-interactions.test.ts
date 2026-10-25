import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { describe, it } from "node:test";

import {
  aimagReply,
  COMMANDS,
  editOriginal,
  findPlaceByName,
  khaihReply,
  placeChoices,
  toimReply,
  validDiscordSignature,
} from "@/lib/social/discord-interactions";

describe("discord interactions", () => {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const publicHex = publicKey.export({ format: "der", type: "spki" }).subarray(-32).toString("hex");
  const body = Buffer.from(JSON.stringify({ type: 1 }));
  const ts = "1761400000";
  const sig = sign(null, Buffer.concat([Buffer.from(ts), body]), privateKey).toString("hex");

  it("accepts only Discord's Ed25519 signature over timestamp + body", () => {
    assert.ok(validDiscordSignature(body, sig, ts, publicHex));
    assert.ok(!validDiscordSignature(Buffer.from('{"type":2}'), sig, ts, publicHex), "tampered body");
    assert.ok(!validDiscordSignature(body, sig, "1761400001", publicHex), "other timestamp");
    assert.ok(!validDiscordSignature(body, null, ts, publicHex));
    assert.ok(!validDiscordSignature(body, "zz", ts, publicHex));
    assert.ok(!validDiscordSignature(body, sig, ts, "not-a-key"));
  });

  it("registers three commands for servers, DMs and user installs", () => {
    assert.deepEqual(
      COMMANDS.map((c) => c.name),
      ["toim", "khaih", "aimag"],
    );
    for (const c of COMMANDS) {
      assert.match(c.name, /^[a-z]{1,32}$/);
      assert.ok(c.description.length <= 100);
      assert.deepEqual(c.integration_types, [0, 1]);
    }
  });

  it("finds places by slug or Mongolian name and autocompletes them", () => {
    assert.equal(findPlaceByName("Ховд")?.slug, "khovd");
    assert.equal(findPlaceByName("khan-uul")?.slug, "khan-uul");
    assert.equal(findPlaceByName("хан уул")?.slug, "khan-uul");
    assert.equal(findPlaceByName("Атлантис"), undefined);
    assert.equal(placeChoices("ба")[0].name, "Багануур дүүрэг");
    assert.ok(placeChoices("").length <= 25);
    assert.deepEqual(placeChoices("ховд"), [{ name: "Ховд аймаг", value: "khovd" }]);
  });

  it("replies with our stories as masked links without previews", () => {
    const t = toimReply({ title: "Оройн тойм", items: [{ headline: "Төсөв [шинэ]", slug: "tusuv" }] });
    assert.ok(t.includes("`1` [Төсөв шинэ](<https://iltodmedee.mn/article/tusuv>)"));
    assert.ok(t.includes("<https://iltodmedee.mn/digest>"));
    assert.ok(toimReply(null).includes("тойм алга"));
    assert.ok(khaihReply("tusuv", []).includes("Кириллээр"));
    assert.ok(khaihReply("төсөв", [{ title: "A", slug: "a", sourceName: "Сангийн яам" }]).includes("· Сангийн яам"));
    assert.ok(aimagReply(undefined, "Атлантис", []).includes("олдсонгүй"));
    assert.ok(aimagReply(findPlaceByName("Ховд"), "Ховд", []).includes("<https://iltodmedee.mn/place/khovd>"));
  });

  it("edits the deferred reply through the interaction webhook, mentions off", async () => {
    let seen: { url: string; body: Record<string, unknown> } | undefined;
    const f = (async (url: string | URL | Request, init?: RequestInit) => {
      seen = { url: String(url), body: JSON.parse(String(init?.body)) };
      return new Response("{}");
    }) as typeof fetch;
    await editOriginal({ type: 2, application_id: "123", token: "tok" }, "hi @everyone", f);
    assert.equal(seen?.url, "https://discord.com/api/v10/webhooks/123/tok/messages/@original");
    assert.deepEqual(seen?.body.allowed_mentions, { parse: [] });
  });
});
