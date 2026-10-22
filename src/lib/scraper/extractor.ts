import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";

import { contentHash, normalizeText } from "@/lib/text";

import { chooseTitle } from "./titles";

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

/** A date (and optional Ulaanbaatar wall-clock time, UTC+8) or null when it is not plausible. */
function validDate(y: number, m: number, d: number, hour?: number, minute?: number): Date | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const timed = hour !== undefined && minute !== undefined && hour < 24 && minute < 60;
  const date = new Date(timed ? Date.UTC(y, m - 1, d, hour - 8, minute) : Date.UTC(y, m - 1, d));
  // Ignore dates in the future (typos, event dates).
  return date.getTime() > Date.now() + 86_400_000 ? null : date;
}

/** Finds a "2026-10-21", "2026.10.21", "2026 оны 10 сарын 21" or "2026 ... 10-р сар ... 21" date in text. */
export function dateFromText(text: string): Date | null {
  const iso = text.match(/(20\d{2})[./-](\d{1,2})[./-](\d{1,2})(?:[ T]+(\d{1,2}):(\d{2}))?/);
  if (iso) {
    const d = validDate(+iso[1], +iso[2], +iso[3], iso[4] === undefined ? undefined : +iso[4], iso[5] === undefined ? undefined : +iso[5]);
    if (d) return d;
  }
  const mn = text.match(/(20\d{2})\s*оны\s*(\d{1,2})\s*(?:-р|дугаар|дүгээр)?\s*сарын\s*(\d{1,2})/);
  if (mn) {
    const d = validDate(+mn[1], +mn[2], +mn[3]);
    if (d) return d;
  }
  for (const [label, month] of Object.entries(MONTHS_MN)) {
    const m = text.match(new RegExp(`(20\\d{2}).{0,6}${label}.{0,6}(\\d{1,2})`));
    if (m) {
      const d = validDate(+m[1], month, +m[2]);
      if (d) return d;
    }
  }
  return null;
}

const DATE_CLASS = /date|time|ognoo|огноо|publish|post-on|posted|calendar|meta/i;

/** Text directly inside an element (not in its child elements). */
function ownText(el: Element): string {
  return [...el.childNodes]
    .filter((n) => n.nodeType === 3)
    .map((n) => n.textContent ?? "")
    .join("")
    .trim();
}

/**
 * Dates printed in the page chrome around the headline (outside Readability's text): an element
 * whose class names a date, or the text right around the <h1>. Only elements that come before
 * the body's end inside the headline's container count, so "related news" lists are ignored.
 */
function dateNearHeadline(doc: Document, headline?: string): Date | null {
  const key = headline ? normalizeText(headline).replace(/\s+/g, " ").slice(0, 40) : "";
  const h1 =
    [...doc.querySelectorAll("h1")].find((h) => (h.textContent ?? "").trim().length > 0) ??
    // No <h1>: the element that holds the headline (mlsp.gov.mn uses <h5 class="blog-post-title">).
    (key ? [...doc.querySelectorAll("h2, h3, h4, h5, h6, [class*=title]")].find((h) => normalizeText(h.textContent ?? "").replace(/\s+/g, " ").startsWith(key)) : undefined);
  if (!h1) return null;
  let box: Element = h1;
  for (let i = 0; i < 3 && box.parentElement && box.parentElement !== doc.body; i++) box = box.parentElement;
  const all = [...box.querySelectorAll("*")];
  // The body starts at the first paragraph-like element after the headline with real text.
  const h1At = all.indexOf(h1);
  const bodyAt = all.findIndex((el, i) => i > h1At && /^(P|DIV|SECTION|ARTICLE)$/.test(el.tagName) && ownText(el).length > 150);
  const candidates = all.slice(0, bodyAt === -1 ? undefined : bodyAt).filter((el) => {
    const cls = `${el.getAttribute("class") ?? ""} ${el.id} ${el.querySelector("i")?.getAttribute("class") ?? ""}`;
    return DATE_CLASS.test(cls) && (el.textContent ?? "").trim().length <= 60;
  });
  for (const el of candidates) {
    const d = dateFromText(el.textContent ?? "");
    if (d) return d;
  }
  // Text around the headline: what precedes it inside the box and the first 300 characters after.
  const boxText = normalizeText(box.textContent ?? "");
  const at = boxText.indexOf(normalizeText(h1.textContent ?? ""));
  if (at >= 0) return dateFromText(boxText.slice(Math.max(0, at - 300), at + (h1.textContent ?? "").length + 300));
  return null;
}

function jsonLdDate(doc: Document): Date | null {
  for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
    const m = (s.textContent ?? "").match(/"datePublished"\s*:\s*"([^"]+)"/);
    const d = m ? new Date(m[1]) : null;
    if (d && !Number.isNaN(d.getTime())) return d;
  }
  return null;
}

/** Finds a publication date in meta tags, JSON-LD, <time>, the URL, the headline area or the text. */
export function extractPublishedDate(doc: Document, url: string, text: string, headline?: string): Date | null {
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
  const ld = jsonLdDate(doc);
  if (ld) return ld;
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
  return dateNearHeadline(doc, headline) ?? dateFromText(text.slice(0, 600));
}

/** Turns an HTML page into clean article text with Readability. Never stores HTML. */
export function extractArticle(html: string, url: string): ExtractedArticle | null {
  const dom = new JSDOM(stripHeavyTags(html), { url, virtualConsole: silentConsole });
  const doc = dom.window.document;
  const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute("content");
  const siteNames = [doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content"), ...doc.title.split(/\s*[|–—]\s*|\s+-\s+/).slice(1)];
  const h1 = [...doc.querySelectorAll("article h1, main h1, h1")].map((h) => h.textContent ?? "").find((t) => t.trim().length > 0);
  const parsed = new Readability(doc.cloneNode(true) as Document, { charThreshold: 100 }).parse();

  const text = normalizeText(parsed?.textContent ?? "");
  if (text.length < MIN_ARTICLE_CHARS) {
    dom.window.close();
    return null;
  }
  const title = chooseTitle([parsed?.title, ogTitle, h1, cleanTitle(doc.title)], text, siteNames);
  const result: ExtractedArticle = {
    title,
    text,
    excerpt: normalizeText(parsed?.excerpt ?? "") || text.slice(0, 280),
    hash: contentHash(text),
    publishedAt: extractPublishedDate(doc, url, text, title),
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
