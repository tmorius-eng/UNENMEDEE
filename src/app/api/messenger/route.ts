import { eq } from "drizzle-orm";
import { after } from "next/server";

import { getDb, hasDatabase } from "@/db";
import { appSettings } from "@/db/schema";
import { getDigests, search } from "@/lib/queries";
import { INSTAGRAM_SETTINGS_KEY } from "@/lib/social/instagram";
import {
  classify,
  digestReply,
  helpReply,
  incoming,
  IG_APP_SECRET_KEY,
  MESSENGER_SETTINGS_KEY,
  type MessengerSettings,
  parseSettings,
  sameSecret,
  searchReply,
  seenOnce,
  sendText,
  validSignature,
} from "@/lib/social/messenger";

/**
 * Messenger and Instagram DM webhook for ИЛ ТОД МЭДЭЭ (src/lib/social/messenger.ts). GET answers
 * Meta's subscription check; POST verifies the X-Hub-Signature-256 HMAC (app secret or Instagram
 * app secret) before reading anything, answers 200 at once and replies afterwards (`after()`), so a
 * slow search never makes Meta redeliver the event; a redelivered message id is answered once per
 * instance (`seenOnce`). Replies use our own stories only. Secrets come from the
 * MESSENGER_SETTINGS env var (Vercel) or app_settings; the Instagram token is the one the pipeline
 * keeps refreshed in app_settings (`instagram`). Both are cached per instance for 5 minutes.
 */
let cached: { at: number; settings: MessengerSettings | null } | undefined;

async function settings(): Promise<MessengerSettings | null> {
  const fromEnv = parseSettings(process.env.MESSENGER_SETTINGS);
  if (fromEnv) return fromEnv;
  if (cached && Date.now() - cached.at < 5 * 60_000) return cached.settings;
  if (!hasDatabase()) return null;
  const [row] = await getDb().select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, MESSENGER_SETTINGS_KEY));
  cached = { at: Date.now(), settings: parseSettings(row?.value) };
  return cached.settings;
}

let igCached: { at: number; token: string | null } | undefined;

async function instagramToken(): Promise<string | null> {
  if (igCached && Date.now() - igCached.at < 5 * 60_000) return igCached.token;
  if (!hasDatabase()) return null;
  const [row] = await getDb().select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, INSTAGRAM_SETTINGS_KEY));
  let token: string | null = null;
  try {
    token = row ? ((JSON.parse(row.value) as { token?: string }).token ?? null) : null;
  } catch {
    token = null;
  }
  igCached = { at: Date.now(), token };
  return token;
}

let igSecretCached: { at: number; secret: string | null } | undefined;

/** Instagram-Login webhooks are signed with the Instagram app secret: settings JSON, IG_APP_SECRET or app_settings. */
async function instagramAppSecret(s: MessengerSettings): Promise<string | null> {
  const direct = s.igAppSecret ?? process.env.IG_APP_SECRET?.trim();
  if (direct) return direct;
  if (igSecretCached && Date.now() - igSecretCached.at < 5 * 60_000) return igSecretCached.secret;
  if (!hasDatabase()) return null;
  const [row] = await getDb().select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, IG_APP_SECRET_KEY));
  igSecretCached = { at: Date.now(), secret: row?.value.trim() || null };
  return igSecretCached.secret;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const s = await settings();
  if (s && url.searchParams.get("hub.mode") === "subscribe" && sameSecret(url.searchParams.get("hub.verify_token"), s.verifyToken)) {
    return new Response(url.searchParams.get("hub.challenge") ?? "", { headers: { "content-type": "text/plain" } });
  }
  return new Response("forbidden", { status: 403 });
}

async function replyTo(text: string): Promise<string> {
  const intent = classify(text);
  if (intent.kind === "help") return helpReply();
  if (intent.kind === "digest") return digestReply((await getDigests("12h", 1))[0] ?? null);
  const found = await search(intent.q);
  return searchReply(intent.q, found.articles);
}

const alreadyAnswered = seenOnce();

export async function POST(req: Request) {
  const raw = Buffer.from(await req.arrayBuffer());
  const s = await settings();
  const signature = req.headers.get("x-hub-signature-256");
  if (!s) return new Response("forbidden", { status: 403 });
  if (!validSignature(raw, signature, s.appSecret)) {
    const igSecret = await instagramAppSecret(s);
    if (!igSecret || !validSignature(raw, signature, igSecret)) return new Response("forbidden", { status: 403 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw.toString("utf8"));
  } catch {
    return new Response("bad request", { status: 400 });
  }
  const messages = incoming(body).filter((m) => !alreadyAnswered(m.mid));
  // Answer Meta first (it redelivers slow or non-200 answers, which repeated replies), then reply.
  after(async () => {
    const igToken = messages.some((m) => m.channel === "instagram") ? await instagramToken().catch(() => null) : null;
    const results = await Promise.allSettled(
      messages.map(async (m) => {
        const token = m.channel === "instagram" ? igToken : s.pageToken;
        if (!token) throw new Error("no Instagram token stored yet");
        await sendText({ pageToken: token, channel: m.channel, recipientId: m.senderId, text: await replyTo(m.text) });
      }),
    );
    for (const r of results) if (r.status === "rejected") console.error("[messenger]", r.reason instanceof Error ? r.reason.message : r.reason);
  });
  return new Response("EVENT_RECEIVED");
}
