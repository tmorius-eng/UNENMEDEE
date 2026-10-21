import * as cheerio from "cheerio";

import { contentHash, normalizeText } from "@/lib/text";

import type { ExtractedArticle } from "./extractor";

/**
 * Article extraction for request-time code (admin "analyze this URL").
 *
 * The Readability + jsdom extractor is loaded lazily: importing jsdom at module scope
 * crashed on Vercel's runtime (ERR_REQUIRE_ESM inside html-encoding-sniffer) and took every
 * admin action down with it, login included. If jsdom cannot load, a simpler cheerio
 * extraction keeps the feature working.
 */
export async function extractArticleSafe(html: string, url: string): Promise<ExtractedArticle | null> {
  try {
    const { extractArticle } = await import("./extractor");
    return extractArticle(html, url);
  } catch (err) {
    console.warn("[extract] jsdom unavailable, using the cheerio fallback:", err instanceof Error ? err.message.split("\n")[0] : err);
    return extractWithCheerio(html);
  }
}

export function extractWithCheerio(html: string): ExtractedArticle | null {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, header, footer, aside, form, iframe").remove();
  const title = ($('meta[property="og:title"]').attr("content") || $("h1").first().text() || $("title").text()).trim();
  const root = $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");
  const text = normalizeText(
    root
      .find("p, h2, h3, li")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t) => t.length > 0)
      .join("\n"),
  );
  if (text.length < 200) return null;
  const published = $('meta[property="article:published_time"]').attr("content") || $("time[datetime]").attr("datetime");
  const date = published ? new Date(published) : null;
  return { title: title || text.slice(0, 120), text, excerpt: text.slice(0, 200), hash: contentHash(text), publishedAt: date && !Number.isNaN(date.getTime()) ? date : null };
}
