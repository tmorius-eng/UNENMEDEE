import "./net-setup";
import { publicFetch } from "./net-guard";
import { DomainThrottle, getRobots, MAX_CRAWL_DELAY_MS, USER_AGENT } from "./robots";

const throttle = new DomainThrottle();

export class RobotsDisallowedError extends Error {
  constructor(url: string) {
    super(`robots.txt disallows ${url}`);
    this.name = "RobotsDisallowedError";
  }
}

export interface PoliteFetchOptions extends Omit<RequestInit, "signal"> {
  timeoutMs?: number;
  /**
   * Skip the robots.txt check: only for robots.txt itself and for APIs the publisher
   * documents for developers (see src/lib/opendata-mn/client.ts). The host delay still applies.
   */
  skipRobots?: boolean;
}

/**
 * fetch() that respects robots.txt, waits >= 8s between requests to the same host
 * (or the site's Crawl-delay if longer, at most MAX_CRAWL_DELAY_MS: a robots.txt asking for an
 * hour must not stall the whole pipeline), identifies itself, times out, and reaches only public
 * addresses on every redirect hop (publicFetch). Used for APIs, adapters, discovery, the source
 * re-check and admin "analyze this URL".
 */
export async function politeFetch(url: string, opts: PoliteFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 30_000, skipRobots = false, headers, redirect = "follow", ...init } = opts;
  const u = new URL(url);
  let crawlDelayMs = 0;
  if (!skipRobots) {
    const robots = await getRobots(u.origin);
    if (!robots.isAllowed(u.pathname + u.search)) throw new RobotsDisallowedError(url);
    crawlDelayMs = Math.min(robots.crawlDelayMs ?? 0, MAX_CRAWL_DELAY_MS);
  }
  await throttle.wait(u.host, crawlDelayMs);
  return publicFetch(url, {
    ...init,
    redirect,
    headers: { "user-agent": USER_AGENT, "accept-language": "mn,en;q=0.8", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
}

export class ResponseTooLargeError extends Error {
  constructor(maxBytes: number) {
    super(`response larger than ${Math.round(maxBytes / 1024)} KB`);
    this.name = "ResponseTooLargeError";
  }
}

/**
 * A response body as text, refused once it passes `maxBytes` (counted after decompression, so a
 * small gzip bomb is stopped too). `res.text()` buffers whatever the server sends.
 */
export async function readTextLimited(res: Response, maxBytes: number): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new ResponseTooLargeError(maxBytes);
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
