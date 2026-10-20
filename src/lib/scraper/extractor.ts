import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";

import { contentHash, normalizeText } from "@/lib/text";

export interface ExtractedArticle {
  title: string;
  text: string;
  excerpt: string;
  hash: string;
  publishedAt: Date | null;
}

/** Article bodies shorter than this are treated as navigation/listing pages. */
export const MIN_ARTICLE_CHARS = 200;

const silentConsole = new VirtualConsole();

function stripHeavyTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
}

/** Strip " – Site name" / " | Site name" suffixes from <title>. */
export function cleanTitle(title: string): string {
  const t = normalizeText(title).replace(/\s+/g, " ");
  const parts = t.split(/\s+[|–—-]\s+/);
  if (parts.length > 1 && parts[0].length >= 15) return parts[0].trim();
  return t;
}

const MONTHS_MN: Record<string, number> = {
  "1-р сар": 1, "2-р сар": 2, "3-р сар": 3, "4-р сар": 4, "5-р сар": 5, "6-р сар": 6,
  "7-р сар": 7, "8-р сар": 8, "9-р сар": 9, "10-р сар": 10, "11-р сар": 11, "12-р сар": 12,
};

function validDate(y: number, m: number, d: number): Date | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  // Ignore dates in the future (typos, event dates).
  return date.getTime() > Date.now() + 86_400_000 ? null : date;
}

/** Finds a publication date in meta tags, <time>, the URL, or the first lines of text. */
export function extractPublishedDate(doc: Document, url: string, text: string): Date | null {
  const metaSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="pubdate"]',
    'meta[name="publishdate"]',
    'meta[name="date"]',
    'meta[itemprop="datePublished"]',
  ];
  for (const sel of metaSelectors) {
    const v = doc.querySelector(sel)?.getAttribute("content");
    const d = v ? new Date(v) : null;
    if (d && !Number.isNaN(d.getTime())) return d;
  }
  const timeAttr = doc.querySelector("time[datetime]")?.getAttribute("datetime");
  if (timeAttr) {
    const d = new Date(timeAttr);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const fromUrl = decodeURIComponent(url).match(/\/(20\d{2})\/(\d{1,2})\/(\d{1,2})\//);
  if (fromUrl) {
    const d = validDate(+fromUrl[1], +fromUrl[2], +fromUrl[3]);
    if (d) return d;
  }
  const head = text.slice(0, 600);
  const iso = head.match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})/);
  if (iso) {
    const d = validDate(+iso[1], +iso[2], +iso[3]);
    if (d) return d;
  }
  const mn = head.match(/(20\d{2})\s*оны\s*(\d{1,2})\s*(?:-р|дугаар)?\s*сарын\s*(\d{1,2})/);
  if (mn) {
    const d = validDate(+mn[1], +mn[2], +mn[3]);
    if (d) return d;
  }
  for (const [label, month] of Object.entries(MONTHS_MN)) {
    const m = head.match(new RegExp(`(20\\d{2}).{0,6}${label}.{0,6}(\\d{1,2})`));
    if (m) {
      const d = validDate(+m[1], month, +m[2]);
      if (d) return d;
    }
  }
  return null;
}

/** Turns an HTML page into clean article text with Readability. Never stores HTML. */
export function extractArticle(html: string, url: string): ExtractedArticle | null {
  const dom = new JSDOM(stripHeavyTags(html), { url, virtualConsole: silentConsole });
  const doc = dom.window.document;
  const rawTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content") || doc.title || "";
  const parsed = new Readability(doc.cloneNode(true) as Document, { charThreshold: 100 }).parse();

  const text = normalizeText(parsed?.textContent ?? "");
  if (text.length < MIN_ARTICLE_CHARS) {
    dom.window.close();
    return null;
  }
  const title = cleanTitle(parsed?.title || rawTitle) || text.slice(0, 100);
  const result: ExtractedArticle = {
    title,
    text,
    excerpt: normalizeText(parsed?.excerpt ?? "") || text.slice(0, 280),
    hash: contentHash(text),
    publishedAt: extractPublishedDate(doc, url, text),
  };
  dom.window.close();
  return result;
}

/** Converts an HTML fragment (e.g. WordPress `content.rendered`) to normalized text. */
export function htmlFragmentToText(html: string): string {
  const dom = new JSDOM(`<body>${stripHeavyTags(html)}</body>`, { virtualConsole: silentConsole });
  const doc = dom.window.document;
  doc.querySelectorAll("p, br, li, h1, h2, h3, h4, tr, div").forEach((el) => el.append("\n"));
  const text = normalizeText(doc.body.textContent ?? "");
  dom.window.close();
  return text;
}
