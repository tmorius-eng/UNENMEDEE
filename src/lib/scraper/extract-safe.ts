import * as cheerio from "cheerio";

import { contentHash, normalizeText } from "@/lib/text";

import type { ExtractedArticle } from "./extractor";
import { chooseTitle } from "./titles";

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

const BLOCKS = new Set(["p", "h2", "h3", "li"]);

/**
 * The text of each outermost p / h2 / h3 / li under `root`, in document order. One walk, and a
 * block's own text is read once: `find("p, li")` read a nested list item again for every list
 * item around it, so a compact page of nested lists grew into megabytes of repeated text.
 */
interface DomNode {
  type: string;
  name?: string;
  children?: DomNode[];
}

function blockTexts($: cheerio.CheerioAPI, root: { contents(): { toArray(): unknown[] } }): string[] {
  const out: string[] = [];
  const stack = [...(root.contents().toArray() as DomNode[])].reverse();
  while (stack.length) {
    const node = stack.pop()!;
    if (node.type !== "tag") continue;
    if (BLOCKS.has((node.name ?? "").toLowerCase())) {
      const t = $(node as never).text().trim();
      if (t) out.push(t);
      continue;
    }
    const kids = node.children ?? [];
    for (let i = kids.length - 1; i >= 0; i--) stack.push(kids[i]);
  }
  return out;
}

export function extractWithCheerio(html: string): ExtractedArticle | null {
  const $ = cheerio.load(html);
  $("script, style, noscript, nav, header, footer, aside, form, iframe").remove();
  const pageTitle = $("title").first().text();
  const siteNames = [$('meta[property="og:site_name"]').attr("content"), ...pageTitle.split(/\s*[|–—]\s*|\s+-\s+/).slice(1)];
  const h1 = $("h1")
    .map((_, el) => $(el).text())
    .get()
    .find((t) => t.trim().length > 0);
  const root = $("article").first().length ? $("article").first() : $("main").first().length ? $("main").first() : $("body");
  const text = normalizeText(blockTexts($, root).join("\n"));
  if (text.length < 200) return null;
  const published = $('meta[property="article:published_time"]').attr("content") || $("time[datetime]").attr("datetime");
  const date = published ? new Date(published) : null;
  const title = chooseTitle([$('meta[property="og:title"]').attr("content"), h1, pageTitle], text, siteNames);
  return { title, text, excerpt: text.slice(0, 200), hash: contentHash(text), publishedAt: date && !Number.isNaN(date.getTime()) ? date : null };
}
