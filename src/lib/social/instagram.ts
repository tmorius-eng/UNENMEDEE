/**
 * Instagram posting (Instagram API with Instagram Login, graph.instagram.com): an image container
 * from our own JPEG card (/ig-image, Instagram accepts only JPEG fetched from a public URL), wait
 * until it is FINISHED, then publish. Captions are plain text (links are not clickable there, so
 * they point to the link in the bio). The 60-day token is seeded by INSTAGRAM_TOKEN and kept and
 * refreshed in app_settings key INSTAGRAM_SETTINGS_KEY, exactly like Threads.
 */
import { editionLabel } from "@/lib/edition";
import { largestAmount, tldrSentences } from "@/lib/format";
import { PRODUCTION_URL } from "@/lib/site";

import type { ArticleForPost, DigestForPost } from "./facebook";
import { hashtags } from "./hashtags";

export const INSTAGRAM_API = "https://graph.instagram.com";
export const INSTAGRAM_VERSION = process.env.IG_GRAPH_VERSION || "v26.0";
export const INSTAGRAM_SETTINGS_KEY = "instagram";
export const CAPTION_MAX = 2200;

export interface InstagramPost {
  imageUrl: string;
  caption: string;
}

function fit(text: string): string {
  return text.length <= CAPTION_MAX ? text : `${text.slice(0, CAPTION_MAX - 1)}…`;
}

export function instagramDigestPost(d: DigestForPost, site = PRODUCTION_URL): InstagramPost {
  const [top, ...rest] = d.items;
  const lines = [`🗞 ${editionLabel(d)}`, ""];
  if (top) lines.push(`⚡ ${top.headline}`, ...(top.whyItMatters ? [`👉 ${top.whyItMatters}`] : []), "");
  if (rest.length) lines.push("Мөн өнөөдөр:", ...rest.slice(0, 9).map((it) => `• ${it.headline}`), "");
  lines.push("Бүгдийг эх сурвалжийн холбоостой нь: iltodmedee.mn (холбоос bio-д)", "", hashtags("instagram"));
  return { imageUrl: `${site}/ig-image?d=${d.id}`, caption: fit(lines.join("\n")) };
}

export function instagramArticlePost(a: ArticleForPost, site = PRODUCTION_URL): InstagramPost {
  const amount = largestAmount(a.amounts);
  const caption = [
    `${a.riskFlag ? "🚨" : "⚡"} ${a.title}`,
    "",
    `👉 ${tldrSentences(a.tldr, 3).join(" ")}`,
    ...(amount ? [`💰 Дүн: ${amount}`] : []),
    ...(a.riskFlag ? ["⚠️ AI-ийн эрсдэлийн үнэлгээ өндөр (буруутгал биш)"] : []),
    `🏛 Эх сурвалж: ${a.sourceName}`,
    "",
    "Дэлгэрэнгүй, эх баримтын холбоос: iltodmedee.mn (холбоос bio-д)",
    "",
    hashtags("instagram", a.topic),
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

/** Refreshes a long-lived Instagram Login token (restarts its 60 days; it must be 24 h old). */
export async function refreshInstagramToken(token: string, fetchImpl: Fetch = fetch): Promise<string> {
  const json = await call(fetchImpl, `${INSTAGRAM_API}/refresh_access_token?${new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token })}`);
  if (typeof json.access_token !== "string") throw new Error("Instagram refresh returned no token");
  return json.access_token;
}

/** Creates the image container, waits until Instagram has fetched the JPEG, publishes, returns the media id. */
export async function publishInstagram(opts: { token: string; post: InstagramPost; fetchImpl?: Fetch; sleep?: (ms: number) => Promise<void> }): Promise<string> {
  const f = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const base = `${INSTAGRAM_API}/${INSTAGRAM_VERSION}`;
  const token = opts.token;
  const created = await call(f, `${base}/me/media`, {
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
  const published = await call(f, `${base}/me/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: id, access_token: token }) });
  return String(published.id ?? id);
}
