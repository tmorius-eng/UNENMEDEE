/**
 * Instagram posting (Instagram API with Facebook Login): the professional account linked to the
 * ИЛ ТОД МЭДЭЭ Facebook page publishes with the page's never-expiring token (FB_PAGE_TOKEN with
 * instagram_basic + instagram_content_publish) and its id IG_USER_ID. An image container is made
 * from our own JPEG card (/ig-image, Instagram accepts only JPEG fetched from a public URL), polled
 * until FINISHED, then published. Captions are plain text: links are not clickable there, so they
 * point to the link in the bio.
 */
import { editionLabel } from "@/lib/edition";
import { largestAmount, tldrSentences } from "@/lib/format";
import { PRODUCTION_URL } from "@/lib/site";

import { type ArticleForPost, type DigestForPost, GRAPH_VERSION } from "./facebook";

export const CAPTION_MAX = 2200;
const TAGS = "#ИлТодМэдээ #Монгол #мэдээ #төр";

export interface InstagramPost {
  imageUrl: string;
  caption: string;
}

function fit(text: string): string {
  return text.length <= CAPTION_MAX ? text : `${text.slice(0, CAPTION_MAX - 1)}…`;
}

export function instagramDigestPost(d: DigestForPost, site = PRODUCTION_URL): InstagramPost {
  const lines = d.items.slice(0, 10).map((it, i) => `${i + 1}. ${it.headline}`);
  const caption = [`🗞 ${editionLabel(d)}`, d.title, "", d.intro, "", ...lines, "", "Бүтнээр нь, эх сурвалжийн холбоостой: iltodmedee.mn (холбоос bio-д)", "", TAGS].join("\n");
  return { imageUrl: `${site}/ig-image?d=${d.id}`, caption: fit(caption) };
}

export function instagramArticlePost(a: ArticleForPost, site = PRODUCTION_URL): InstagramPost {
  const amount = largestAmount(a.amounts);
  const caption = [
    `📰 ${a.title}`,
    "",
    ...tldrSentences(a.tldr, 3),
    "",
    ...(amount ? [`💰 ${amount}`] : []),
    ...(a.riskFlag ? ["🚨 AI-ийн эрсдэлийн үнэлгээ өндөр (буруутгал биш)"] : []),
    `🏛 Эх сурвалж: ${a.sourceName}`,
    "",
    "Дэлгэрэнгүй, эх баримтын холбоос: iltodmedee.mn (холбоос bio-д)",
    "",
    TAGS,
  ].join("\n");
  return { imageUrl: `${site}/ig-image?a=${encodeURIComponent(a.slug)}`, caption: fit(caption) };
}

type Fetch = typeof fetch;

async function call(fetchImpl: Fetch, url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(60_000) });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string; code?: number } };
  if (!res.ok || json.error) throw new Error(`Instagram ${res.status}: ${json.error?.message ?? "request failed"} (code ${json.error?.code ?? "?"})`.slice(0, 300));
  return json;
}

/** Creates the image container, waits until Instagram has fetched the JPEG, publishes, returns the media id. */
export async function publishInstagram(opts: {
  igUserId: string;
  token: string;
  post: InstagramPost;
  fetchImpl?: Fetch;
  sleep?: (ms: number) => Promise<void>;
  version?: string;
}): Promise<string> {
  const f = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const base = `https://graph.facebook.com/${opts.version ?? GRAPH_VERSION}`;
  const user = encodeURIComponent(opts.igUserId);
  const token = opts.token;
  const created = await call(f, `${base}/${user}/media`, {
    method: "POST",
    body: new URLSearchParams({ image_url: opts.post.imageUrl, caption: opts.post.caption, access_token: token }),
  });
  const id = String(created.id ?? "");
  if (!id) throw new Error("Instagram returned no container id");
  for (let i = 0; i < 12; i++) {
    const s = await call(f, `${base}/${encodeURIComponent(id)}?${new URLSearchParams({ fields: "status_code,status", access_token: token })}`);
    if (s.status_code === "FINISHED") break;
    if (s.status_code === "ERROR" || s.status_code === "EXPIRED") throw new Error(`Instagram container ${String(s.status_code)}: ${String(s.status ?? "")}`);
    await sleep(5_000);
  }
  const published = await call(f, `${base}/${user}/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: id, access_token: token }) });
  return String(published.id ?? id);
}
