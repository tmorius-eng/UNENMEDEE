import { after } from "next/server";

import { getDigests, getPlaceFeed, search } from "@/lib/queries";
import {
  aimagReply,
  editOriginal,
  findPlaceByName,
  type Interaction,
  InteractionType,
  haihReply,
  optionValue,
  placeChoices,
  ResponseType,
  toimReply,
  validDiscordSignature,
} from "@/lib/social/discord-interactions";

/**
 * Discord Interactions Endpoint (src/lib/social/discord-interactions.ts). Every request must carry a
 * valid Ed25519 signature for DISCORD_PUBLIC_KEY (the app's public key, a Vercel env var), else 401:
 * Discord itself checks that we refuse bad signatures. Commands answer "thinking…" at once (Discord
 * allows 3 s) and the reply is edited in `after()` when the data is in.
 */
async function answer(i: Interaction): Promise<string> {
  const name = i.data?.name;
  if (name === "toim") return toimReply((await getDigests("12h", 1))[0] ?? null);
  if (name === "haih") {
    const q = optionValue(i, "ug").slice(0, 100);
    return haihReply(q, q ? (await search(q)).articles : []);
  }
  if (name === "aimag") {
    const typed = optionValue(i, "ner");
    const place = findPlaceByName(typed);
    return aimagReply(place, typed, place ? await getPlaceFeed(place.domains, 5) : []);
  }
  return "Энэ командыг танихгүй байна. `/toim`, `/haih`, `/aimag` ашиглаарай.";
}

export async function POST(req: Request) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY?.trim();
  if (!publicKey) return new Response("not configured", { status: 404 });
  const raw = Buffer.from(await req.arrayBuffer());
  if (!validDiscordSignature(raw, req.headers.get("x-signature-ed25519"), req.headers.get("x-signature-timestamp"), publicKey)) {
    return new Response("invalid request signature", { status: 401 });
  }
  let i: Interaction;
  try {
    i = JSON.parse(raw.toString("utf8")) as Interaction;
  } catch {
    return new Response("bad request", { status: 400 });
  }
  if (i.type === InteractionType.PING) return Response.json({ type: ResponseType.PONG });
  if (i.type === InteractionType.AUTOCOMPLETE) {
    const focused = i.data?.options?.find((o) => o.focused);
    return Response.json({ type: ResponseType.AUTOCOMPLETE, data: { choices: placeChoices(typeof focused?.value === "string" ? focused.value : "") } });
  }
  if (i.type === InteractionType.COMMAND) {
    after(async () => {
      let content: string;
      try {
        content = await answer(i);
      } catch (err) {
        console.error("[discord]", err instanceof Error ? err.message : err);
        content = "Уучлаарай, түр алдаа гарлаа 😵 Дахиад оролдоорой.";
      }
      await editOriginal(i, content).catch((err: unknown) => console.error("[discord]", err instanceof Error ? err.message : err));
    });
    return Response.json({ type: ResponseType.DEFERRED });
  }
  return new Response("unsupported interaction", { status: 400 });
}
