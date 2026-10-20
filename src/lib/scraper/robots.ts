/**
 * Minimal, dependency-free robots.txt support (RFC 9309 + Google wildcard semantics).
 *
 * - Groups are matched by user-agent token; all `User-agent: *` groups are merged.
 * - Longest matching rule wins; `Allow` wins ties.
 * - `*` matches any sequence, `$` anchors the end.
 * - A robots.txt that is missing (4xx) or is not plain text (e.g. an SPA
 *   returning its HTML shell) means "allow everything".
 * - A 5xx or network failure means "disallow everything" for this run (RFC 9309 §2.3.1.4).
 */

export const BOT_NAME = "IlTodBot";
export const USER_AGENT = `Mozilla/5.0 (compatible; ${BOT_NAME}/1.0; +https://github.com/tmorius-eng/UNENMEDEE)`;

/** Minimum delay between two requests to the same host. CLAUDE.md rule #1. */
export const MIN_DOMAIN_DELAY_MS = 8_000;

interface Rule {
  allow: boolean;
  pattern: string;
  regex: RegExp;
}

export interface RobotsPolicy {
  isAllowed(pathAndQuery: string): boolean;
  /** Crawl-delay in ms declared for our agent, if any. */
  crawlDelayMs?: number;
  sitemaps: string[];
}

const ALLOW_ALL: RobotsPolicy = { isAllowed: () => true, sitemaps: [] };
const DISALLOW_ALL: RobotsPolicy = { isAllowed: () => false, sitemaps: [] };

function patternToRegex(pattern: string): RegExp {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const escaped = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${escaped}${anchored ? "$" : ""}`);
}

/** Looks like an HTML page rather than a robots file. */
function looksLikeHtml(text: string): boolean {
  return /^\s*<(!doctype|html|head|body)/i.test(text);
}

export function parseRobots(text: string, agent: string = BOT_NAME): RobotsPolicy {
  if (!text || looksLikeHtml(text)) return ALLOW_ALL;

  const ua = agent.toLowerCase();
  const sitemaps: string[] = [];
  // Each group: its agents and its rules.
  const groups: { agents: string[]; rules: Rule[]; crawlDelay?: number }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (key === "sitemap") {
      sitemaps.push(value);
      continue;
    }
    if (!current) continue;
    if (key === "allow" || key === "disallow") {
      // An empty Disallow means "allow all" and adds no rule.
      if (!value) continue;
      current.rules.push({ allow: key === "allow", pattern: value, regex: patternToRegex(value) });
    } else if (key === "crawl-delay") {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.crawlDelay = n;
    }
  }

  // Prefer groups naming our bot; otherwise merge every `*` group.
  let selected = groups.filter((g) => g.agents.some((a) => a !== "*" && ua.includes(a)));
  if (selected.length === 0) selected = groups.filter((g) => g.agents.includes("*"));
  const rules = selected.flatMap((g) => g.rules);
  const delays = selected.map((g) => g.crawlDelay).filter((d): d is number => d !== undefined);

  return {
    sitemaps,
    crawlDelayMs: delays.length ? Math.max(...delays) * 1000 : undefined,
    isAllowed(pathAndQuery: string) {
      let best: Rule | null = null;
      for (const rule of rules) {
        if (!rule.regex.test(pathAndQuery)) continue;
        if (
          !best ||
          rule.pattern.length > best.pattern.length ||
          (rule.pattern.length === best.pattern.length && rule.allow && !best.allow)
        ) {
          best = rule;
        }
      }
      return best ? best.allow : true;
    },
  };
}

const cache = new Map<string, Promise<RobotsPolicy>>();

/** Fetches (once per origin per process) and parses robots.txt. */
export function getRobots(origin: string, fetchImpl: typeof fetch = fetch): Promise<RobotsPolicy> {
  const cached = cache.get(origin);
  if (cached) return cached;
  const promise = (async () => {
    try {
      const res = await fetchImpl(`${origin}/robots.txt`, {
        headers: { "user-agent": USER_AGENT },
        redirect: "follow",
        signal: AbortSignal.timeout(15_000),
      });
      if (res.status >= 500) return DISALLOW_ALL;
      if (!res.ok) return ALLOW_ALL;
      const type = res.headers.get("content-type") ?? "";
      const text = await res.text();
      if (type.includes("html")) return ALLOW_ALL;
      return parseRobots(text);
    } catch {
      return DISALLOW_ALL;
    }
  })();
  cache.set(origin, promise);
  return promise;
}

export async function isAllowedByRobots(url: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const u = new URL(url);
  const policy = await getRobots(u.origin, fetchImpl);
  return policy.isAllowed(u.pathname + u.search);
}

/** Per-host politeness scheduler: guarantees >= delay between request starts to one host. */
export class DomainThrottle {
  private nextSlot = new Map<string, number>();

  constructor(private readonly minDelayMs: number = MIN_DOMAIN_DELAY_MS) {}

  async wait(host: string, extraDelayMs = 0): Promise<void> {
    const delay = Math.max(this.minDelayMs, extraDelayMs);
    const now = Date.now();
    const slot = Math.max(now, this.nextSlot.get(host) ?? 0);
    this.nextSlot.set(host, slot + delay);
    if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
  }
}
