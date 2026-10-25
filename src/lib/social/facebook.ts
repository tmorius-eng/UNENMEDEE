/**
 * Facebook page posting (Graph API, `POST /{page-id}/feed` with `message` + `link`). Pure message
 * builders plus one small client, so the wording is unit-tested and the token never leaves here.
 * Facebook builds the preview card from the linked page's Open Graph tags (our OG images).
 * Facts only: the text is the AI summary and the official source, never a verdict.
 */
import { editionLabel } from "@/lib/edition";
import { largestAmount, tldrSentences } from "@/lib/format";
import { PRODUCTION_URL } from "@/lib/site";

export const GRAPH_VERSION = process.env.FB_GRAPH_VERSION || "v26.0";
const HASHTAG = "#ИлТодМэдээ";

export interface FacebookPost {
  message: string;
  link: string;
}

export interface DigestForPost {
  id: number;
  kind: string;
  title: string;
  intro: string;
  periodEnd: Date | string;
  items: { headline: string }[];
}

export interface ArticleForPost {
  id: number;
  slug: string;
  title: string;
  tldr: string;
  sourceName: string;
  amounts: string[];
  riskFlag: boolean;
}

/** "🗞 ӨГЛӨӨНИЙ ТОЙМ · 07:05" + title, intro, the first five headlines and the link. */
export function digestPost(d: DigestForPost, site = PRODUCTION_URL): FacebookPost {
  const top = d.items.slice(0, 5).map((it, i) => `${i + 1}. ${it.headline}`);
  const more = d.items.length > top.length ? `\n…болон өөр ${d.items.length - top.length} мэдээ` : "";
  const message = [`🗞 ${editionLabel(d)}`, d.title, "", d.intro, "", ...top].join("\n") + more + `\n\nБүтнээр нь уншаарай 👇\n\n${HASHTAG}`;
  return { message, link: `${site}/digest` };
}

/** One important story: headline, two summary sentences, the largest ₮ amount and the source. */
export function articlePost(a: ArticleForPost, site = PRODUCTION_URL): FacebookPost {
  const lines = [`📰 ${a.title}`, "", ...tldrSentences(a.tldr, 2)];
  const amount = largestAmount(a.amounts);
  const facts = [amount ? `💰 ${amount}` : null, a.riskFlag ? "🚨 AI-ийн эрсдэлийн үнэлгээ өндөр (буруутгал биш)" : null, `🏛 Эх сурвалж: ${a.sourceName}`].filter(Boolean);
  const message = [...lines, "", ...facts].join("\n") + `\n\nДэлгэрэнгүй, эх баримтын холбоос 👇\n\n${HASHTAG}`;
  return { message, link: `${site}/article/${a.slug}` };
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
  const body = new URLSearchParams({ message: opts.post.message, link: opts.post.link, access_token: opts.token });
  const res = await (opts.fetchImpl ?? fetch)(`https://graph.facebook.com/${opts.version ?? GRAPH_VERSION}/${encodeURIComponent(opts.pageId)}/feed`, {
    method: "POST",
    body,
    signal: AbortSignal.timeout(30_000),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string; code?: number } };
  if (!res.ok || !json.id) {
    throw new FacebookError(`Facebook ${res.status}: ${json.error?.message ?? "no post id returned"}`.slice(0, 300), res.status, json.error?.code);
  }
  return json.id;
}
