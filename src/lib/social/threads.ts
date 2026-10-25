/**
 * Threads posting (graph.threads.com): a TEXT container with `link_attachment`, then publish.
 * Long-lived tokens last 60 days and are refreshed by the pipeline (scripts/post-social.ts keeps
 * the current one in app_settings key THREADS_SETTINGS_KEY; THREADS_TOKEN only seeds it, see
 * token-state.ts). Texts are capped at 500 characters, emoji counting as their UTF-8 bytes. The
 * token travels as the documented `access_token` parameter and never appears in an error message.
 */
import { editionLabel } from "@/lib/edition";
import { largestAmount, tldrSentences } from "@/lib/format";
import { PRODUCTION_URL } from "@/lib/site";

import type { ArticleForPost, DigestForPost } from "./facebook";

export const THREADS_API = "https://graph.threads.com";
export const THREADS_SETTINGS_KEY = "threads";
export const THREADS_MAX = 500;

export interface ThreadsPost {
  text: string;
  link: string;
}

/** Threads counts emoji (and other astral symbols) as their UTF-8 byte length. */
export function threadsLength(text: string): number {
  let n = 0;
  for (const ch of text) n += /\p{Extended_Pictographic}/u.test(ch) || ch.codePointAt(0)! > 0xffff ? Buffer.byteLength(ch) : 1;
  return n;
}

function cut(text: string, max: number): string {
  if (threadsLength(text) <= max) return text;
  let out = "";
  for (const ch of text) {
    if (threadsLength(out + ch) > max - 1) break;
    out += ch;
  }
  return `${out.trimEnd()}…`;
}

/** Edition label, title and as many of the first five headlines as fit. */
export function threadsDigestPost(d: DigestForPost, site = PRODUCTION_URL): ThreadsPost {
  const head = `🗞 ${editionLabel(d)}\n${cut(d.title, 160)}`;
  const tail = "\n\n#ИлТодМэдээ";
  let lines = d.items.slice(0, 5).map((it, i) => `${i + 1}. ${cut(it.headline, 140)}`);
  const compose = () => `${head}\n\n${lines.join("\n")}${tail}`;
  while (lines.length > 1 && threadsLength(compose()) > THREADS_MAX) lines = lines.slice(0, -1);
  return { text: cut(compose(), THREADS_MAX), link: `${site}/digest` };
}

/** One important story: headline, the first summary sentence, the largest ₮ amount, the source. */
export function threadsArticlePost(a: ArticleForPost, site = PRODUCTION_URL): ThreadsPost {
  const amount = largestAmount(a.amounts);
  const parts = [`📰 ${cut(a.title, 200)}`, "", cut(tldrSentences(a.tldr, 1)[0] ?? "", 200), "", ...(amount ? [`💰 ${amount}`] : []), `🏛 ${a.sourceName}`];
  return { text: cut(parts.join("\n"), THREADS_MAX), link: `${site}/article/${a.slug}` };
}

type Fetch = typeof fetch;

async function call(fetchImpl: Fetch, url: string, init?: RequestInit): Promise<Record<string, unknown>> {
  const res = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(30_000) });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string; code?: number } };
  if (!res.ok || json.error) throw new Error(`Threads ${res.status}: ${json.error?.message ?? "request failed"} (code ${json.error?.code ?? "?"})`.slice(0, 300));
  return json;
}

/** Refreshes a long-lived token (restarts its 60 days). */
export async function refreshToken(token: string, fetchImpl: Fetch = fetch): Promise<string> {
  const json = await call(fetchImpl, `${THREADS_API}/refresh_access_token?${new URLSearchParams({ grant_type: "th_refresh_token", access_token: token })}`);
  if (typeof json.access_token !== "string") throw new Error("Threads refresh returned no token");
  return json.access_token;
}

/** Creates the TEXT container, waits until it is FINISHED, publishes it and returns the post id. */
export async function publishThreads(opts: { token: string; post: ThreadsPost; fetchImpl?: Fetch; sleep?: (ms: number) => Promise<void> }): Promise<string> {
  const f = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const token = opts.token;
  const body = new URLSearchParams({ media_type: "TEXT", text: opts.post.text, link_attachment: opts.post.link, access_token: token });
  const created = await call(f, `${THREADS_API}/v1.0/me/threads`, { method: "POST", body });
  const id = String(created.id ?? "");
  if (!id) throw new Error("Threads returned no container id");
  for (let i = 0; i < 10; i++) {
    const s = await call(f, `${THREADS_API}/v1.0/${encodeURIComponent(id)}?${new URLSearchParams({ fields: "status,error_message", access_token: token })}`);
    if (s.status === "FINISHED") break;
    if (s.status === "ERROR" || s.status === "EXPIRED") throw new Error(`Threads container ${s.status}: ${String(s.error_message ?? "")}`);
    await sleep(3_000);
  }
  const published = await call(f, `${THREADS_API}/v1.0/me/threads_publish`, { method: "POST", body: new URLSearchParams({ creation_id: id, access_token: token }) });
  return String(published.id ?? id);
}
