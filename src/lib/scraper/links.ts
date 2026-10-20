import * as cheerio from "cheerio";

export interface LinkCandidate {
  url: string;
  text: string;
  score: number;
}

const FILE_EXT = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|jpe?g|png|gif|webp|svg|mp4|mp3|avi|mov|apk|exe)(\?|$)/i;
const NON_ARTICLE =
  /\/(c|tag|tags|category|categories|author|page|search|login|signin|register|feed|rss|wp-admin|wp-content|wp-json|wp-login|cart|contact|about|sitemap|lang|language|static|download|files?|uploads?|gallery|video|photos?)(\/|$|\?)|[?&](page|lang|s|replytocom)=/i;

/** Path patterns used by Mongolian government CMSs for single articles. */
const ARTICLE_PATTERNS: [RegExp, number][] = [
  [/\/20\d{2}\/\d{1,2}\/\d{1,2}\/[^/]+/, 5], // WordPress dated permalinks
  [/\/(news|medee|мэдээ|post|posts|article|articles|content\/detail|detail|view|read|n|p|c\/news)\/[^/?#]*\d[^/?#]*/i, 4],
  [/\/(news|medee|post|posts|article|articles|blog|announcement|zarlal|tender|shiidver|tushaal|niitlel)\/[^/?#]{8,}/i, 3],
  [/[?&](id|news_id|post_id|nid|aid)=\d+/i, 3],
  [/\/\d{3,}(\.(html?|php|aspx?))?(\/|$|\?)/, 3],
  [/\/[^/]*-[^/]*-[^/]*-[^/]+\/?$/, 2], // long hyphenated slugs
];

/** Page chrome whose links are almost never articles. */
const CHROME_SELECTOR = [
  "nav",
  "header",
  "footer",
  '[role="navigation"]',
  // Whole class tokens only: wrappers like "has-menu" must not swallow the page.
  '[class~="menu" i]',
  '[class~="navbar" i]',
  '[class~="footer" i]',
  '[class~="breadcrumb" i]',
  '[class~="sub-menu" i]',
  '[id="menu" i]',
  '[id="footer" i]',
  'ul[class*="menu" i]',
  'li[class*="menu-item" i]',
].join(", ");

/** Same organization if hosts match ignoring "www." (and allowing subdomains of the source). */
export function sameSite(host: string, sourceDomain: string): boolean {
  const h = host.replace(/^www\./, "").toLowerCase();
  const d = sourceDomain.replace(/^www\./, "").toLowerCase();
  return h === d || h.endsWith(`.${d}`) || d.endsWith(`.${h}`);
}

export function scoreLink(url: URL, text: string): number {
  const path = decodeURIComponent(url.pathname + url.search);
  if (FILE_EXT.test(path) || NON_ARTICLE.test(path)) return 0;
  if (url.pathname === "/" || url.pathname.length < 4) return 0;
  let score = 0;
  for (const [re, w] of ARTICLE_PATTERNS) if (re.test(path)) score = Math.max(score, w);
  const len = text.trim().length;
  if (len >= 25) score += 2;
  else if (len >= 12) score += 1;
  else if (len < 4) score -= 1;
  // Cyrillic anchor text is a strong signal of a Mongolian headline.
  if (/[Ѐ-ӿ]{4,}/.test(text)) score += 1;
  return score;
}

/**
 * Harvests likely article links from a listing or home page.
 * Returns unique same-site URLs sorted by score (best first).
 */
export function harvestArticleLinks(html: string, pageUrl: string, sourceDomain: string, max = 40): LinkCandidate[] {
  const $ = cheerio.load(html);
  const base = new URL(pageUrl);
  const best = new Map<string, LinkCandidate>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href || href.startsWith("#") || /^(mailto|tel|javascript):/i.test(href)) return;
    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      return;
    }
    if (!/^https?:$/.test(url.protocol) || !sameSite(url.hostname, sourceDomain)) return;
    url.hash = "";
    const text = $(el).text().replace(/\s+/g, " ").trim() || $(el).attr("title") || "";
    let score = scoreLink(url, text);
    // Menus, headers and footers link to static pages ("About", "Structure"), not news.
    if ($(el).closest(CHROME_SELECTOR).length) score -= 5;
    if (score < 3) return;
    const key = url.toString();
    const prev = best.get(key);
    if (!prev || score > prev.score || text.length > prev.text.length) {
      best.set(key, { url: key, text: text.length > (prev?.text.length ?? 0) ? text : (prev?.text ?? text), score: Math.max(score, prev?.score ?? 0) });
    }
  });

  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, max);
}

/** Finds an RSS/Atom feed advertised by the page. */
export function findFeedUrl(html: string, pageUrl: string): string | null {
  const $ = cheerio.load(html);
  const href = $('link[rel="alternate"][type="application/rss+xml"], link[rel="alternate"][type="application/atom+xml"]')
    .first()
    .attr("href");
  if (!href) return null;
  try {
    const url = new URL(href, pageUrl);
    // WordPress comment feeds are not news.
    return /comments\/feed/.test(url.pathname) ? null : url.toString();
  } catch {
    return null;
  }
}

export function isWordPress(html: string): boolean {
  return /\/wp-content\/|\/wp-includes\/|wp-json/i.test(html);
}

/** Parses RSS 2.0 or Atom into item links. */
export function parseFeed(xml: string): { url: string; title: string; publishedAt: Date | null }[] {
  const $ = cheerio.load(xml, { xml: true });
  const items: { url: string; title: string; publishedAt: Date | null }[] = [];
  $("item, entry").each((_, el) => {
    const node = $(el);
    const url = node.find("link").first().attr("href") || node.find("link").first().text().trim();
    const title = node.find("title").first().text().trim();
    const dateText = node.find("pubDate, published, updated, dc\\:date").first().text().trim();
    const date = dateText ? new Date(dateText) : null;
    if (url) items.push({ url, title, publishedAt: date && !Number.isNaN(date.getTime()) ? date : null });
  });
  return items;
}
