import "./net-setup";
import { CheerioCrawler, Configuration, log, PlaywrightCrawler } from "crawlee";

import { extractTenderMeta, hasTenderSignals } from "./adapters/tender";
import { cleanTitle, extractArticle, htmlFragmentToText, MIN_ARTICLE_CHARS, parseDateValue } from "./extractor";
import { findFeedUrl, harvestArticleLinks, harvestSectionLinks, isWordPress, parseFeed, sameSite, wordPressApiBase, wordPressPostsUrl } from "./links";
import { BOT_NAME, MIN_DOMAIN_DELAY_MS, USER_AGENT } from "./robots";
import type { ScrapedItem, SourceRef, SourceRunResult } from "./types";

/** Storage hooks so the crawler works with the DB or in --dry-run mode. */
export interface ArticleSink {
  /** Returns the subset of URLs not yet stored. */
  filterNewUrls(urls: string[]): Promise<Set<string>>;
  save(source: SourceRef, item: ScrapedItem): Promise<"inserted" | "duplicate">;
}

export interface CrawlOptions {
  /** Max new articles per source per run. */
  perSourceLimit: number;
  /** Stop gracefully after this many ms (GitHub Actions job budget). */
  budgetMs: number;
  /** Parallel requests across different domains. Same-domain requests are always >= 8s apart. */
  concurrency: number;
  /** Backfill mode: keep only items with a known publication date after this one. */
  since?: Date;
  /** Second pass with headless Chromium for JavaScript-rendered sites. Default true. */
  browser?: boolean;
  onProgress?: (msg: string) => void;
}

type Label = "LISTING" | "FEED" | "WP_API" | "ARTICLE";
type Mode = "http" | "browser";

interface UserData {
  label: Label;
  sourceId: number;
  /** "primary" = source.urlPattern, "home" = homepage fallback, "section" = a news section the splash page links to */
  attempt?: "primary" | "home" | "section";
  /** Harvested HTML links to use if the WP API / feed path fails. */
  fallbackLinks?: string[];
  /** The page's RSS feed: tried when the WordPress REST API fails or is empty. */
  feedUrl?: string;
}

interface SourceState extends SourceRunResult {
  source: SourceRef;
  queuedArticles: number;
  triedHome: boolean;
  /** Listing had no links in raw HTML: retry it in the browser. */
  needsBrowserListing: boolean;
  /** Article URLs whose raw HTML had no extractable body: retry them in the browser. */
  needsBrowserArticles: string[];
  /** Section listings queued from a splash page that have not answered yet. */
  pendingSections: number;
  /** Sections are followed once per pass (a section page never fans out again). */
  sectionsTried: boolean;
}

const BODY_MIME_TYPES = ["application/json", "application/rss+xml", "application/atom+xml", "application/xml", "text/xml"];
const BLOCKED_RESOURCES = new Set(["image", "media", "font", "stylesheet"]);

function homepage(source: SourceRef): string {
  return `${new URL(source.urlPattern).origin}/`;
}

/** First line of the message; network errors often have none, so fall back to their code. */
export function errorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const e = error as Error & { code?: string; cause?: unknown; errors?: unknown[] };
  const inner = [e.cause, ...(e.errors ?? [])].find((x): x is Error & { code?: string } => x instanceof Error);
  const text = e.message.split("\n")[0].trim() || inner?.message.split("\n")[0].trim() || "";
  const code = e.code ?? inner?.code ?? (inner?.cause as { code?: string } | undefined)?.code;
  return (code && !text.includes(code) ? `${code} ${text}` : text || e.name).trim().slice(0, 300);
}

/**
 * Crawls many government sources:
 *  1. plain HTTP (Cheerio) for every source: WordPress REST API, RSS, or link harvesting;
 *  2. headless Chromium for the sources whose news only appears after JavaScript runs.
 * Different domains run in parallel; each domain gets >= 8s between requests and
 * robots.txt is respected. One dead site never fails the batch.
 */
export async function crawlSources(sources: SourceRef[], sink: ArticleSink, opts: CrawlOptions): Promise<SourceRunResult[]> {
  log.setLevel(log.LEVELS.WARNING);
  const progress = opts.onProgress ?? (() => {});
  const deadline = Date.now() + opts.budgetMs;
  const states = new Map<number, SourceState>(
    sources.map((s) => [
      s.id,
      {
        source: s,
        sourceId: s.id,
        domain: s.domain,
        found: 0,
        inserted: 0,
        skippedDuplicates: 0,
        error: null,
        completed: false,
        queuedArticles: 0,
        triedHome: false,
        needsBrowserListing: false,
        needsBrowserArticles: [],
        pendingSections: 0,
        sectionsTried: false,
      },
    ]),
  );

  // ---------------------------------------------------------------- shared logic
  async function saveItem(state: SourceState, item: ScrapedItem) {
    if (opts.since && (!item.publishedAt || item.publishedAt < opts.since)) {
      // Backfill: older than the window, or undated (it would be stored as "today" and show up
      // as fresh news). Give the slot back to a newer article.
      state.queuedArticles -= 1;
      state.found -= 1;
      return;
    }
    if (hasTenderSignals(item.text)) {
      const meta = extractTenderMeta(item.text);
      if (Object.keys(meta).length) item.meta = { ...item.meta, ...meta };
    }
    const outcome = await sink.save(state.source, item);
    if (outcome === "inserted") {
      state.inserted += 1;
      progress(`  ✓ ${state.domain}: ${item.title.slice(0, 90)}`);
    } else {
      state.skippedDuplicates += 1;
    }
  }

  /** Dedupe against storage, respect the per-source limit, and hand URLs to `add`. */
  async function pickArticles(state: SourceState, urls: string[]): Promise<string[]> {
    const room = opts.perSourceLimit - state.queuedArticles;
    if (room <= 0 || urls.length === 0) return [];
    const unique = [...new Set(urls)];
    const fresh = await sink.filterNewUrls(unique);
    state.skippedDuplicates += unique.length - fresh.size;
    const picked = [...fresh].slice(0, room);
    state.queuedArticles += picked.length;
    state.found += picked.length;
    return picked;
  }

  async function runPass(mode: Mode, seed: (add: Adder) => Promise<void>): Promise<void> {
    const remaining = deadline - Date.now();
    if (remaining < 30_000) return;
    const config = new Configuration({ persistStorage: false, purgeOnStart: true });

    const handle = async (url: string, loadedUrl: string, data: UserData, html: string, add: Adder) => {
      const state = states.get(data.sourceId);
      if (!state) return;
      switch (data.label) {
        case "LISTING":
          return handleListing(mode, state, data, loadedUrl, html, add);
        case "WP_API":
          return handleWpApi(state, data, html, add);
        case "FEED":
          return handleFeed(state, data, html, add);
        case "ARTICLE": {
          const article = extractArticle(html, loadedUrl);
          if (article) {
            await saveItem(state, { url, title: article.title, text: article.text, publishedAt: article.publishedAt });
          } else if (mode === "http") {
            state.queuedArticles -= 1; // give the slot back; the browser pass may fill it
            state.found -= 1;
            state.needsBrowserArticles.push(url);
          }
        }
      }
    };

    const onFailure = async (url: string, data: UserData, error: unknown, add: Adder) => {
      const state = states.get(data.sourceId);
      if (!state) return;
      const message = errorMessage(error);
      if (data.label === "LISTING") {
        if (data.attempt === "section") {
          state.pendingSections -= 1;
          if (state.pendingSections <= 0) {
            state.completed = true;
            if (state.queuedArticles === 0 && state.inserted === 0 && !state.error) state.error = `listing failed: ${message}`;
          }
        } else if (mode === "http" && !state.triedHome && url !== homepage(state.source)) {
          state.triedHome = true;
          await add([listingRequest(state, homepage(state.source), "home")]);
        } else {
          state.error = `listing failed: ${message}`;
          state.completed = true;
        }
      } else if (data.label === "WP_API" && data.feedUrl) {
        await add([{ url: data.feedUrl, userData: { label: "FEED", sourceId: state.sourceId, fallbackLinks: data.fallbackLinks } satisfies UserData }]);
      } else if ((data.label === "WP_API" || data.label === "FEED") && data.fallbackLinks?.length) {
        const picked = await pickArticles(state, data.fallbackLinks);
        await add(picked.map((u) => articleRequest(state, u)));
      } else if (data.label === "WP_API" || data.label === "FEED") {
        // Nothing else to try: say so instead of counting the run as a success.
        state.error = `${data.label === "WP_API" ? "WordPress API" : "feed"} failed: ${message}`;
        if (mode === "http") state.needsBrowserListing = true;
      }
      progress(`  ✗ ${state.domain} ${data.label} ${url} — ${message}`);
    };

    const common = {
      maxConcurrency: mode === "http" ? opts.concurrency : Math.min(4, opts.concurrency),
      sameDomainDelaySecs: MIN_DOMAIN_DELAY_MS / 1000,
      respectRobotsTxtFile: { userAgent: BOT_NAME },
      maxRequestRetries: 1,
      navigationTimeoutSecs: 45, // some .gov.mn servers answer slowly from abroad
      requestHandlerTimeoutSecs: 90,
    };

    let crawler: CheerioCrawler | PlaywrightCrawler;
    if (mode === "http") {
      const c: CheerioCrawler = new CheerioCrawler(
        {
          ...common,
          ignoreSslErrors: true,
          // A 404/410 page is not an article (Crawlee hands other 4xx bodies to the handler).
          additionalHttpErrorStatusCodes: [404, 410, 451],
          additionalMimeTypes: BODY_MIME_TYPES,
          preNavigationHooks: [
            (_ctx, gotOptions) => {
              gotOptions.headers = { ...gotOptions.headers, "user-agent": USER_AGENT, "accept-language": "mn,en;q=0.8" };
            },
          ],
          requestHandler: async (ctx) => {
            const add: Adder = async (reqs) => void (reqs.length && (await c.addRequests(reqs)));
            await handle(ctx.request.url, ctx.request.loadedUrl ?? ctx.request.url, ctx.request.userData as UserData, ctx.body.toString(), add);
          },
          failedRequestHandler: async ({ request }, error) => {
            await onFailure(request.url, request.userData as UserData, error, async (reqs) => void (reqs.length && (await c.addRequests(reqs))));
          },
        },
        config,
      );
      crawler = c;
    } else {
      const p: PlaywrightCrawler = new PlaywrightCrawler(
        {
          ...common,
          headless: true,
          launchContext: {
            userAgent: USER_AGENT,
            launchOptions: {
              executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || undefined,
              args: ["--ignore-certificate-errors"],
            },
          },
          preNavigationHooks: [
            async ({ page }) => {
              await page.route("**/*", (route) =>
                BLOCKED_RESOURCES.has(route.request().resourceType()) ? route.abort() : route.continue(),
              );
            },
          ],
          requestHandler: async ({ page, request, response }) => {
            const add: Adder = async (reqs) => void (reqs.length && (await p.addRequests(reqs)));
            const status = response?.status() ?? 200;
            if (status >= 400) return onFailure(request.url, request.userData as UserData, new Error(`HTTP ${status}`), add);
            // Let client-side rendering finish (SPAs fetch their news after load).
            await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
            const html = await page.content();
            await handle(request.url, request.loadedUrl ?? request.url, request.userData as UserData, html, add);
          },
          failedRequestHandler: async ({ request }, error) => {
            await onFailure(request.url, request.userData as UserData, error, async (reqs) => void (reqs.length && (await p.addRequests(reqs))));
          },
        },
        config,
      );
      crawler = p;
    }

    await seed(async (reqs) => void (reqs.length && (await crawler.addRequests(reqs))));
    const timer = setTimeout(() => {
      progress(`⏱  Time budget reached; stopping the ${mode} pass gracefully.`);
      crawler.stop("time budget reached");
    }, remaining);
    try {
      await crawler.run();
    } finally {
      clearTimeout(timer);
    }
  }

  // ---------------------------------------------------------------- handlers
  async function handleListing(mode: Mode, state: SourceState, data: UserData, pageUrl: string, html: string, add: Adder) {
    if (data.attempt === "section") state.pendingSections -= 1;
    if (state.pendingSections <= 0) state.completed = true;
    const links = harvestArticleLinks(html, pageUrl, state.domain, opts.perSourceLimit * 4).map((l) => l.url);
    const feed = mode === "http" ? findFeedUrl(html, pageUrl) : null;
    const sameSiteFeed = feed && sameSite(new URL(feed).hostname, state.domain) ? feed : undefined;

    if (mode === "http" && isWordPress(html)) {
      const perPage = opts.since ? 100 : Math.min(opts.perSourceLimit * 2, 50);
      const after = opts.since ? `&after=${opts.since.toISOString().slice(0, 19)}` : "";
      // The advertised REST base: "/index.php?rest_route=/" on sites without pretty permalinks.
      const api = wordPressPostsUrl(wordPressApiBase(html, pageUrl), `per_page=${perPage}${after}&_fields=id,link,title,date,date_gmt,content`);
      await add([{ url: api, userData: { label: "WP_API", sourceId: state.sourceId, fallbackLinks: links, feedUrl: sameSiteFeed } satisfies UserData }]);
      return;
    }
    if (sameSiteFeed) {
      await add([{ url: sameSiteFeed, userData: { label: "FEED", sourceId: state.sourceId, fallbackLinks: links } satisfies UserData }]);
      return;
    }
    // A splash page (govi-altai's "/" only links to "/home", dornod's to "/j"): follow its news
    // sections once, in this pass, before giving up on the source.
    if (links.length < 3 && !state.sectionsTried) {
      const sections = harvestSectionLinks(html, pageUrl, state.domain).filter((u) => u !== pageUrl);
      if (sections.length) {
        state.sectionsTried = true;
        state.pendingSections += sections.length;
        state.completed = false;
        await add(sections.map((u) => listingRequest(state, u, "section", mode)));
      }
    }
    if (links.length > 0) {
      state.error = null;
      const picked = await pickArticles(state, links);
      await add(picked.map((u) => articleRequest(state, u)));
      return;
    }
    if (state.pendingSections > 0) return; // a section page may still deliver the news
    if (mode === "http" && data.attempt === "primary" && !state.triedHome && pageUrl !== homepage(state.source)) {
      state.triedHome = true;
      state.completed = false;
      await add([listingRequest(state, homepage(state.source), "home")]);
      return;
    }
    if (state.queuedArticles > 0 || state.inserted > 0) return; // another listing of this source found the news
    if (mode === "http") state.needsBrowserListing = true;
    state.error = mode === "http" ? "no article links in HTML" : "no article links found even after JavaScript rendering";
  }

  async function handleWpApi(state: SourceState, data: UserData, body: string, add: Adder) {
    let posts: { id?: number; link?: string; title?: { rendered?: string }; date?: string; date_gmt?: string; content?: { rendered?: string } }[] = [];
    try {
      const parsed = JSON.parse(body);
      if (Array.isArray(parsed)) posts = parsed;
    } catch {
      /* REST API disabled or not JSON: fall back to the feed or harvested links */
    }
    if (posts.length === 0) {
      if (data.feedUrl) {
        await add([{ url: data.feedUrl, userData: { label: "FEED", sourceId: state.sourceId, fallbackLinks: data.fallbackLinks } satisfies UserData }]);
        return;
      }
      const picked = await pickArticles(state, data.fallbackLinks ?? []);
      if (picked.length === 0 && !(data.fallbackLinks ?? []).length) state.needsBrowserListing = true;
      await add(picked.map((u) => articleRequest(state, u)));
      return;
    }
    // Some installs omit `link` from the REST response (bnd.ub.gov.mn); "?p=<id>" always resolves.
    const origin = new URL(state.source.urlPattern).origin;
    const linkOf = (p: (typeof posts)[number]) => p.link || (p.id ? `${origin}/?p=${p.id}` : undefined);
    const urls = posts.map(linkOf).filter((u): u is string => Boolean(u));
    const fresh = await sink.filterNewUrls(urls);
    state.skippedDuplicates += urls.length - fresh.size;
    for (const post of posts) {
      const link = linkOf(post);
      if (!link || !fresh.has(link) || state.queuedArticles >= opts.perSourceLimit) continue;
      const text = htmlFragmentToText(post.content?.rendered ?? "");
      if (text.length < MIN_ARTICLE_CHARS) continue;
      state.queuedArticles += 1;
      state.found += 1;
      // Some installs strip date_gmt from the response (bnd.ub.gov.mn): `date` is site-local time.
      const date = post.date_gmt ? new Date(`${post.date_gmt}Z`) : parseDateValue(post.date);
      await saveItem(state, {
        url: link,
        title: cleanTitle(htmlFragmentToText(post.title?.rendered ?? "")) || text.slice(0, 100),
        text,
        publishedAt: date && !Number.isNaN(date.getTime()) ? date : null,
      });
    }
  }

  async function handleFeed(state: SourceState, data: UserData, body: string, add: Adder) {
    const items = parseFeed(body).filter((i) => {
      if (opts.since && i.publishedAt && i.publishedAt < opts.since) return false;
      try {
        return sameSite(new URL(i.url).hostname, state.domain);
      } catch {
        return false;
      }
    });
    const picked = await pickArticles(state, items.length ? items.map((i) => i.url) : (data.fallbackLinks ?? []));
    await add(picked.map((u) => articleRequest(state, u)));
  }

  // ---------------------------------------------------------------- passes
  await runPass("http", async (add) => {
    await add([...states.values()].map((s) => listingRequest(s, s.source.urlPattern, "primary")));
  });

  const browserEnabled = opts.browser ?? process.env.SCRAPER_BROWSER !== "0";
  const forBrowser = [...states.values()].filter((s) => s.needsBrowserListing || s.needsBrowserArticles.length);
  if (browserEnabled && forBrowser.length) {
    progress(`🖥  Rendering ${forBrowser.length} JavaScript-heavy source(s) in headless Chromium…`);
    try {
      await runPass("browser", async (add) => {
        const reqs = [];
        for (const s of forBrowser) {
          if (s.needsBrowserListing) {
            s.completed = false;
            s.sectionsTried = false;
            s.pendingSections = 0;
            reqs.push(listingRequest(s, s.source.urlPattern, "primary", "browser"));
          }
          const retry = s.needsBrowserArticles.splice(0, Math.max(0, opts.perSourceLimit - s.queuedArticles));
          s.queuedArticles += retry.length;
          s.found += retry.length;
          reqs.push(...retry.map((u) => articleRequest(s, u, "browser")));
        }
        await add(reqs);
      });
    } catch (err) {
      for (const s of forBrowser) s.completed = true;
      progress(`  ✗ Browser pass unavailable: ${errorMessage(err)} (set CHROMIUM_EXECUTABLE_PATH or run \`npx playwright install chromium\`)`);
    }
  }

  return [...states.values()].map(({ sourceId, domain, found, inserted, skippedDuplicates, error, completed }) => ({
    sourceId,
    domain,
    found,
    inserted,
    skippedDuplicates,
    completed,
    // A source that produced or already had articles is healthy even if one request failed. One
    // that was reached but stored nothing and knew nothing is not: back it off and say why.
    error: inserted > 0 || skippedDuplicates > 0 ? null : (error ?? (completed && found === 0 ? "listing reached but no articles were stored" : null)),
  }));
}

type CrawlRequest = { url: string; uniqueKey?: string; userData: UserData };
type Adder = (reqs: CrawlRequest[]) => Promise<void>;

function listingRequest(state: { sourceId: number }, url: string, attempt: NonNullable<UserData["attempt"]>, mode: Mode = "http"): CrawlRequest {
  return { url, uniqueKey: `${mode}:${attempt}:${url}`, userData: { label: "LISTING", sourceId: state.sourceId, attempt } };
}

function articleRequest(state: { sourceId: number }, url: string, mode: Mode = "http"): CrawlRequest {
  return { url, uniqueKey: `${mode}:article:${url}`, userData: { label: "ARTICLE", sourceId: state.sourceId } };
}
