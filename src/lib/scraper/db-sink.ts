import { and, eq, inArray, sql } from "drizzle-orm";

import type { DB } from "@/db";
import { articles, sources } from "@/db/schema";
import { contentHash, slugify, truncate } from "@/lib/text";

import type { ArticleSink } from "./crawl";
import type { ScrapedItem, SourceRef, SourceRunResult } from "./types";

/** Hard cap per article to protect the 500 MB Supabase free tier (~15 KB of text). */
export const MAX_STORED_CHARS = 15_000;

export function createDbSink(db: DB): ArticleSink {
  return {
    async filterNewUrls(urls) {
      if (urls.length === 0) return new Set();
      const existing = await db
        .select({ url: articles.originalUrl })
        .from(articles)
        .where(inArray(articles.originalUrl, urls));
      const known = new Set(existing.map((r) => r.url));
      return new Set(urls.filter((u) => !known.has(u)));
    },

    async save(source: SourceRef, item: ScrapedItem) {
      // Hash the full cleaned text BEFORE any LLM call (CLAUDE.md rule #2).
      const hash = contentHash(item.text);
      const dup = await db.select({ id: articles.id }).from(articles).where(eq(articles.contentHash, hash)).limit(1);
      if (dup.length) return "duplicate";
      const inserted = await db
        .insert(articles)
        .values({
          sourceId: source.id,
          title: item.title.slice(0, 500),
          slug: slugify(item.title, item.url),
          originalUrl: item.url,
          contentHash: hash,
          cleanContent: truncate(item.text, MAX_STORED_CHARS),
          scrapeMeta: item.meta && Object.keys(item.meta).length ? item.meta : null,
          publishedAt: item.publishedAt ?? new Date(),
          // tldr_summary stays null so `npm run ai:process` picks it up.
        })
        .onConflictDoNothing()
        .returning({ id: articles.id });
      return inserted.length ? "inserted" : "duplicate";
    },
  };
}

/** Writes per-source health after a run (drives exponential backoff for dead sites). */
export async function recordSourceResults(db: DB, results: SourceRunResult[]): Promise<void> {
  const now = new Date();
  for (const r of results) {
    if (!r.completed) continue; // not reached before the time budget: keep it first in line
    await db
      .update(sources)
      .set(
        r.error
          ? { lastScrapedAt: now, lastError: r.error.slice(0, 500), consecutiveFailures: sql`${sources.consecutiveFailures} + 1` }
          : { lastScrapedAt: now, lastError: null, consecutiveFailures: 0 },
      )
      .where(eq(sources.id, r.sourceId));
  }
}

/** Active sources that are due, least-recently scraped first. */
export async function loadDueSources(db: DB, domains?: string[]) {
  const rows = await db
    .select()
    .from(sources)
    .where(domains?.length ? and(eq(sources.isActive, true), inArray(sources.domain, domains)) : eq(sources.isActive, true))
    .orderBy(sql`${sources.lastScrapedAt} asc nulls first`);
  const now = Date.now();
  return rows.filter((s) => {
    if (domains?.length || s.consecutiveFailures === 0 || !s.lastScrapedAt) return true;
    // Back off 2^n hours (max 64h) after n consecutive failures.
    const waitMs = 2 ** Math.min(s.consecutiveFailures, 6) * 3_600_000;
    return now - s.lastScrapedAt.getTime() >= waitMs;
  });
}
