import { DomainThrottle, getRobots, USER_AGENT } from "./robots";

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
 * (or the site's Crawl-delay if longer), identifies itself, and times out.
 * Used for JSON APIs, source discovery and admin "analyze this URL".
 */
export async function politeFetch(url: string, opts: PoliteFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 30_000, skipRobots = false, headers, redirect = "follow", ...init } = opts;
  const u = new URL(url);
  let crawlDelayMs = 0;
  if (!skipRobots) {
    const robots = await getRobots(u.origin);
    if (!robots.isAllowed(u.pathname + u.search)) throw new RobotsDisallowedError(url);
    crawlDelayMs = robots.crawlDelayMs ?? 0;
  }
  await throttle.wait(u.host, crawlDelayMs);
  return fetch(url, {
    ...init,
    redirect,
    headers: { "user-agent": USER_AGENT, "accept-language": "mn,en;q=0.8", ...headers },
    signal: AbortSignal.timeout(timeoutMs),
  });
}
