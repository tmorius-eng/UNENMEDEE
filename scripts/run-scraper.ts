/**
 * Polite, resilient scraper for Mongolian government sources.
 *
 *   npm run scrape                          # all due sources (DB)
 *   npm run scrape -- --source mof.gov.mn   # one or more domains (comma separated)
 *   npm run scrape -- --dry-run --source mlsp.gov.mn --limit 2   # no DB, prints results
 *
 * Options: --limit <n> new articles per source (default 8), --budget <minutes> (default 40),
 *          --concurrency <n> parallel domains (default 8),
 *          --no-browser skip the headless-Chromium pass for JavaScript-rendered sites.
 */
import "dotenv/config";
import { parseArgs } from "node:util";

import { closeDb, getDb, hasDatabase } from "@/db";
import { API_ADAPTERS } from "@/lib/scraper/adapters";
import { crawlSources, type ArticleSink } from "@/lib/scraper/crawl";
import { createDbSink, loadDueSources, recordSourceResults } from "@/lib/scraper/db-sink";
import type { ScrapedItem, SourceRef, SourceRunResult } from "@/lib/scraper/types";
import { SOURCE_SEEDS } from "@/lib/sources";
import { contentHash } from "@/lib/text";

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    source: { type: "string" },
    limit: { type: "string", default: "8" },
    budget: { type: "string", default: "40" },
    concurrency: { type: "string", default: "8" },
    "no-browser": { type: "boolean", default: false },
  },
});

const dryRun = values["dry-run"];
const domains = values.source?.split(",").map((d) => d.trim()).filter(Boolean);
const perSourceLimit = Math.max(1, Number(values.limit));
const budgetMs = Math.max(1, Number(values.budget)) * 60_000;
const concurrency = Math.max(1, Number(values.concurrency));

function createDryRunSink(): ArticleSink {
  const urls = new Set<string>();
  const hashes = new Set<string>();
  return {
    async filterNewUrls(list) {
      return new Set(list.filter((u) => !urls.has(u)));
    },
    async save(source, item) {
      const hash = contentHash(item.text);
      if (urls.has(item.url) || hashes.has(hash)) return "duplicate";
      urls.add(item.url);
      hashes.add(hash);
      console.log(`\n── [${source.domain}] ${item.title}`);
      console.log(`   url:  ${item.url}`);
      console.log(`   date: ${item.publishedAt?.toISOString() ?? "—"}   sha256: ${hash.slice(0, 16)}…   chars: ${item.text.length}`);
      if (item.meta) console.log(`   meta: ${JSON.stringify(item.meta)}`);
      console.log(`   text: ${item.text.slice(0, 220).replace(/\n/g, " ")}…`);
      return "inserted";
    },
  };
}

async function runApiSource(source: SourceRef, sink: ArticleSink, fetchItems: (limit: number) => Promise<ScrapedItem[]>): Promise<SourceRunResult> {
  const result: SourceRunResult = { sourceId: source.id, domain: source.domain, found: 0, inserted: 0, skippedDuplicates: 0, error: null, completed: true };
  try {
    const items = await fetchItems(perSourceLimit * 3);
    const fresh = await sink.filterNewUrls(items.map((i) => i.url));
    result.skippedDuplicates = items.length - fresh.size;
    for (const item of items.filter((i) => fresh.has(i.url)).slice(0, perSourceLimit)) {
      result.found += 1;
      if ((await sink.save(source, item)) === "inserted") result.inserted += 1;
      else result.skippedDuplicates += 1;
    }
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }
  return result;
}

async function main() {
  const started = Date.now();
  let sourceRefs: SourceRef[];
  let sink: ArticleSink;

  if (dryRun || !hasDatabase()) {
    if (!dryRun) {
      console.error("✗ DATABASE_URL is not set. Use --dry-run to test without a database.");
      process.exitCode = 1;
      return;
    }
    const seeds = SOURCE_SEEDS.filter((s) => !domains?.length || domains.includes(s.domain));
    sourceRefs = seeds.map((s, i) => ({ id: i + 1, domain: s.domain, name: s.name, urlPattern: s.urlPattern }));
    sink = createDryRunSink();
    console.log(`🧪 Dry run (no DB) over ${sourceRefs.length} source(s).`);
  } else {
    const db = getDb();
    const due = await loadDueSources(db, domains);
    sourceRefs = due.map((s) => ({ id: s.id, domain: s.domain, name: s.name, urlPattern: s.urlPattern }));
    sink = createDbSink(db);
    console.log(`🔎 Scraping ${sourceRefs.length} due source(s); limit ${perSourceLimit}/source; budget ${budgetMs / 60000} min.`);
  }
  if (sourceRefs.length === 0) {
    console.log("Nothing to scrape.");
    return;
  }

  const results: SourceRunResult[] = [];
  // JSON API sources first (fast), then one shared Crawlee run for every HTML site.
  for (const s of sourceRefs) {
    const adapter = API_ADAPTERS[s.domain];
    if (adapter) results.push(await runApiSource(s, sink, adapter));
  }
  const htmlSources = sourceRefs.filter((s) => !API_ADAPTERS[s.domain]);
  if (htmlSources.length) {
    results.push(
      ...(await crawlSources(htmlSources, sink, {
        perSourceLimit,
        budgetMs: Math.max(60_000, budgetMs - (Date.now() - started)),
        concurrency,
        browser: !values["no-browser"],
        onProgress: (m) => console.log(m),
      })),
    );
  }

  if (!dryRun) await recordSourceResults(getDb(), results);

  const inserted = results.reduce((n, r) => n + r.inserted, 0);
  const failed = results.filter((r) => r.error);
  console.log(`\n📊 Summary (${Math.round((Date.now() - started) / 1000)}s): ${inserted} new article(s) from ${results.length} source(s).`);
  for (const r of results.sort((a, b) => b.inserted - a.inserted)) {
    const status = !r.completed ? "⏸ not reached" : r.error ? `✗ ${r.error}` : "✓";
    console.log(`  ${r.domain.padEnd(28)} new=${String(r.inserted).padStart(2)} dup=${String(r.skippedDuplicates).padStart(2)} ${status}`);
  }
  if (failed.length) console.log(`\n${failed.length} source(s) failed; they back off automatically. The batch itself succeeded.`);
}

main()
  .catch((err) => {
    console.error("✗ Scraper crashed:", err);
    process.exitCode = 1;
  })
  .finally(closeDb);
