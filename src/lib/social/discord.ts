/**
 * Discord announcement channel (free, no bot hosting): our bot posts the same digests and stories
 * as Facebook to the ИЛ ТОД МЭДЭЭ server's announcement channel through the REST API, then
 * publishes ("crossposts") the message, so every server that pressed "Follow" on the channel gets
 * it too. Only REST calls from GitHub Actions: the bot never connects to the gateway, so nothing
 * has to stay online. The token goes in the Authorization header only and errors never echo it.
 */
import { articlePost, digestPost, type ArticleForPost, type DigestForPost } from "./facebook";
import { cut } from "./threads";

export const DISCORD_API = "https://discord.com/api/v10";
/** Discord's limit for a message's text. */
export const CONTENT_MAX = 2000;
/** Our brand blue as the embed's side colour. */
const EMBED_COLOR = 0x1570ef;

export interface DiscordPost {
  text: string;
  link: string;
  imageUrl?: string;
}

/**
 * The Facebook text without its hashtag line (they are not links on Discord). Our own link is
 * wrapped in <…> so Discord does not add a second preview under the card embed.
 */
function discordText(message: string, link: string): string {
  return message
    .split("\n")
    .filter((line) => !/^\s*(#\S+\s*)+$/u.test(line))
    .join("\n")
    .trim()
    .replaceAll(link, `<${link}>`);
}

export function discordDigestPost(d: DigestForPost): DiscordPost {
  const p = digestPost(d);
  return { text: discordText(p.message, p.link), link: p.link, imageUrl: p.imageUrl };
}

export function discordArticlePost(a: ArticleForPost): DiscordPost {
  const p = articlePost(a);
  return { text: discordText(p.message, p.link), link: p.link, imageUrl: p.imageUrl };
}

/** The message body: scraped text can contain "@everyone", so no mention is ever resolved. */
export function discordMessage(post: DiscordPost) {
  return {
    content: cut(post.text, CONTENT_MAX),
    embeds: post.imageUrl ? [{ url: post.link, image: { url: post.imageUrl }, color: EMBED_COLOR }] : [],
    allowed_mentions: { parse: [] as string[] },
  };
}

export class DiscordError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DiscordError";
  }
}

/**
 * Posts one message to the channel and returns its id. When `crosspost` is on (an announcement
 * channel), the message is then published to the following servers; a failed publish is reported
 * through `onWarning` and does not fail the post, since the message is already in our channel.
 */
export async function publishDiscord(opts: {
  token: string;
  channelId: string;
  post: DiscordPost;
  crosspost?: boolean;
  fetchImpl?: typeof fetch;
  onWarning?: (message: string) => void;
}): Promise<string> {
  const f = opts.fetchImpl ?? fetch;
  const headers = { authorization: `Bot ${opts.token}`, "content-type": "application/json" };
  const call = async (path: string, body?: unknown) => {
    const res = await f(`${DISCORD_API}${path}`, { method: "POST", headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
    const json = (await res.json().catch(() => ({}))) as { id?: string; message?: string; code?: number };
    if (!res.ok) throw new DiscordError(`Discord ${res.status}: ${(json.message ?? "request failed").replaceAll(opts.token, "***")}`.slice(0, 300), res.status);
    return json;
  };
  const channel = encodeURIComponent(opts.channelId);
  const sent = await call(`/channels/${channel}/messages`, discordMessage(opts.post));
  if (!sent.id) throw new DiscordError("Discord: no message id returned", 200);
  if (opts.crosspost !== false) {
    try {
      await call(`/channels/${channel}/messages/${encodeURIComponent(sent.id)}/crosspost`);
    } catch (err) {
      opts.onWarning?.(`Discord message ${sent.id} was posted but not published to following servers: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return sent.id;
}
