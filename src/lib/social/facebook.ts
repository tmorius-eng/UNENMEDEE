/**
 * Facebook page posting (Graph API). Posts are photo posts with our "hook" card (/ig-image,
 * `POST /{page-id}/photos` with `url` + `caption`, the link inside the text), falling back to a
 * link post (`/feed`) when there is no image. Pure message builders plus one small client, so the
 * wording is unit-tested and the token never leaves here. Hooks are facts only: the editor's
 * headline, "why it matters" and the official source, never a verdict.
 */
import { editionLabel } from "@/lib/edition";
import { largestAmount, tldrSentences } from "@/lib/format";
import { PRODUCTION_URL } from "@/lib/site";

import { hashtags } from "./hashtags";

export const GRAPH_VERSION = process.env.FB_GRAPH_VERSION || "v26.0";

export interface FacebookPost {
  message: string;
  link: string;
  /** Our JPEG hook card; without it the post is a plain link post. */
  imageUrl?: string;
}

export interface DigestForPost {
  id: number;
  kind: string;
  title: string;
  intro: string;
  periodEnd: Date | string;
  items: { headline: string; whyItMatters?: string }[];
}

export interface ArticleForPost {
  id: number;
  slug: string;
  title: string;
  tldr: string;
  sourceName: string;
  amounts: string[];
  riskFlag: boolean;
  /** The article's topic key (src/lib/topics.ts) for hashtags. */
  topic?: string | null;
}

/** Hook first: the top story and why it matters, then the next four headlines and the link. */
export function digestPost(d: DigestForPost, site = PRODUCTION_URL): FacebookPost {
  const link = `${site}/digest`;
  const [top, ...rest] = d.items;
  const lines = [`🗞 ${editionLabel(d)}`, ""];
  if (top) lines.push(`⚡ ${top.headline}`, ...(top.whyItMatters ? [`👉 ${top.whyItMatters}`] : []), "");
  if (rest.length) lines.push("Мөн өнөөдөр:", ...rest.slice(0, 4).map((it) => `• ${it.headline}`), "");
  lines.push(`Бүх ${d.items.length} мэдээ, эх сурвалжтай нь 👉 ${link}`, "", hashtags("facebook"));
  return { message: lines.join("\n"), link, imageUrl: `${site}/ig-image?d=${d.id}` };
}

/** One important story: the headline as the hook, two summary sentences, the largest ₮ amount, the source. */
export function articlePost(a: ArticleForPost, site = PRODUCTION_URL): FacebookPost {
  const link = `${site}/article/${a.slug}`;
  const amount = largestAmount(a.amounts);
  const lines = [
    `${a.riskFlag ? "🚨" : "⚡"} ${a.title}`,
    "",
    `👉 ${tldrSentences(a.tldr, 2).join(" ")}`,
    ...(amount ? [`💰 Дүн: ${amount}`] : []),
    ...(a.riskFlag ? ["⚠️ AI-ийн эрсдэлийн үнэлгээ өндөр (буруутгал биш)"] : []),
    `🏛 Эх сурвалж: ${a.sourceName}`,
    "",
    `Дэлгэрэнгүй, эх баримтын холбоос 👉 ${link}`,
    "",
    hashtags("facebook", a.topic),
  ];
  return { message: lines.join("\n"), link, imageUrl: `${site}/ig-image?a=${encodeURIComponent(a.slug)}` };
}

export class FacebookError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
  ) {
    super(message);
    this.name = "FacebookError";
  }

  /** 190 = the token expired or was revoked; 200/10 = a permission is missing. */
  get hint(): string {
    if (this.code === 190) return "FB_PAGE_TOKEN expired or revoked: make a new never-expiring Page token (docs/FACEBOOK.md).";
    if (this.code === 200 || this.code === 10) return "The token lacks pages_manage_posts for this Page (docs/FACEBOOK.md).";
    if (this.code === 368) return "Facebook temporarily blocked posting from this Page (spam limit): wait and post less often.";
    return "";
  }
}

/** Publishes one post and returns its id. The token goes in the POST body, never in a URL or a log. */
export async function publishToPage(opts: { pageId: string; token: string; post: FacebookPost; fetchImpl?: typeof fetch; version?: string }): Promise<string> {
  const { post } = opts;
  const body = post.imageUrl
    ? new URLSearchParams({ url: post.imageUrl, caption: post.message, access_token: opts.token })
    : new URLSearchParams({ message: post.message, link: post.link, access_token: opts.token });
  const edge = post.imageUrl ? "photos" : "feed";
  const res = await (opts.fetchImpl ?? fetch)(`https://graph.facebook.com/${opts.version ?? GRAPH_VERSION}/${encodeURIComponent(opts.pageId)}/${edge}`, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; post_id?: string; error?: { message?: string; code?: number } };
  if (!res.ok || !json.id) {
    throw new FacebookError(`Facebook ${res.status}: ${json.error?.message ?? "no post id returned"}`.slice(0, 300), res.status, json.error?.code);
  }
  return json.post_id ?? json.id;
}
