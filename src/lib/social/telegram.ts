/**
 * Telegram channel posting (Bot API, free): the bot is an admin of our public channel and posts
 * the same digests and stories as Facebook, as a photo with our hook card (/ig-image) and the
 * Facebook text as caption (≤ 1024 characters), or as a text message when there is no card.
 * The Bot API puts the token in the URL path, so URLs are never logged and errors never echo them.
 */
import { articlePost, digestPost, type ArticleForPost, type DigestForPost } from "./facebook";
import { cut } from "./threads";

export const TELEGRAM_API = "https://api.telegram.org";
/** Telegram's caption limit for photos. */
export const CAPTION_MAX = 1024;
/** Telegram's limit for a text message. */
export const TEXT_MAX = 4096;

export interface TelegramPost {
  text: string;
  link: string;
  imageUrl?: string;
}

export function telegramDigestPost(d: DigestForPost): TelegramPost {
  const p = digestPost(d);
  return { text: p.message, link: p.link, imageUrl: p.imageUrl };
}

export function telegramArticlePost(a: ArticleForPost): TelegramPost {
  const p = articlePost(a);
  return { text: p.message, link: p.link, imageUrl: p.imageUrl };
}

export class TelegramError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TelegramError";
  }
}

/** Publishes one post to the channel and returns the message id. */
export async function publishTelegram(opts: { token: string; chatId: string; post: TelegramPost; fetchImpl?: typeof fetch }): Promise<string> {
  const { post } = opts;
  const method = post.imageUrl ? "sendPhoto" : "sendMessage";
  const body = post.imageUrl
    ? { chat_id: opts.chatId, photo: post.imageUrl, caption: cut(post.text, CAPTION_MAX) }
    : { chat_id: opts.chatId, text: cut(post.text, TEXT_MAX), link_preview_options: { url: post.link } };
  const res = await (opts.fetchImpl ?? fetch)(`${TELEGRAM_API}/bot${opts.token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: { message_id?: number }; description?: string };
  if (!res.ok || !json.ok || json.result?.message_id === undefined) {
    const why = (json.description ?? "no message id returned").replaceAll(opts.token, "***");
    throw new TelegramError(`Telegram ${res.status}: ${why}`.slice(0, 300), res.status);
  }
  return String(json.result.message_id);
}
