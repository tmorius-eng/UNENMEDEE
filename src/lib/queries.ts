import { and, count, desc, eq, gte, inArray, isNotNull, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";

import { getDb, hasDatabase } from "@/db";
import { aiUsageLogs, articles, clusters, sources, transparencyLedger } from "@/db/schema";
import { SOURCE_SEEDS } from "@/lib/sources";
import type { ExtractedEntities, FactVsSpin, ScrapeMeta, SourceCategory } from "@/lib/types";

/**
 * Read model for the public site. Every function:
 *  - is cached with `use cache` + cacheLife + cacheTag (Next.js 16 Cache Components),
 *  - returns empty data when DATABASE_URL is missing or the DB is unreachable,
 *    so `next build` and contributors never need secrets (CLAUDE.md rule #6).
 */

export const FEED_FILTERS = ["all", "risk", "budget", "ministry", "local"] as const;
export type FeedFilter = (typeof FEED_FILTERS)[number];

export function parseFilter(value: string | string[] | undefined): FeedFilter {
  const v = Array.isArray(value) ? value[0] : value;
  return (FEED_FILTERS as readonly string[]).includes(v ?? "") ? (v as FeedFilter) : "all";
}

export interface ArticleListItem {
  id: number;
  slug: string;
  title: string;
  tldr: string;
  sourceName: string;
  sourceDomain: string;
  sourceCategory: SourceCategory;
  publishedAt: Date | null;
  riskScore: number;
  riskFlag: boolean;
  neutralityScore: number | null;
  amounts: string[];
  hasDeepAnalysis: boolean;
  clusterId: number | null;
}

async function safe<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  if (!hasDatabase()) return fallback;
  try {
    return await fn();
  } catch (err) {
    console.error(`[queries] ${label} failed:`, err instanceof Error ? err.message : err);
    return fallback;
  }
}

const listColumns = {
  id: articles.id,
  slug: articles.slug,
  title: articles.title,
  tldr: articles.tldrSummary,
  sourceName: sources.name,
  sourceDomain: sources.domain,
  sourceCategory: sources.category,
  publishedAt: articles.publishedAt,
  riskScore: articles.riskScore,
  riskFlag: articles.riskFlag,
  factVsSpin: articles.factVsSpin,
  entities: articles.extractedEntities,
  deep: articles.grokDeepAnalysis,
  clusterId: articles.clusterId,
};

type ListRow = {
  id: number;
  slug: string;
  title: string;
  tldr: string | null;
  sourceName: string;
  sourceDomain: string;
  sourceCategory: SourceCategory;
  publishedAt: Date | null;
  riskScore: number;
  riskFlag: boolean;
  factVsSpin: FactVsSpin | null;
  entities: ExtractedEntities | null;
  deep: string | null;
  clusterId: number | null;
};

function toListItem(r: ListRow): ArticleListItem {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    tldr: r.tldr ?? "",
    sourceName: r.sourceName,
    sourceDomain: r.sourceDomain,
    sourceCategory: r.sourceCategory,
    publishedAt: r.publishedAt,
    riskScore: r.riskScore,
    riskFlag: r.riskFlag,
    neutralityScore: r.factVsSpin?.neutrality_score ?? null,
    amounts: r.entities?.amounts_mnt ?? [],
    hasDeepAnalysis: Boolean(r.deep),
    clusterId: r.clusterId,
  };
}

/** Only analyzed, published articles appear publicly. */
const visible = and(eq(articles.isPublished, true), isNotNull(articles.tldrSummary));
const BUDGET_DOMAINS = ["tender.gov.mn", "shilendans.gov.mn", "mof.gov.mn", "audit.mn"];

function filterCondition(filter: FeedFilter): SQL | undefined {
  switch (filter) {
    case "risk":
      return eq(articles.riskFlag, true);
    case "budget":
      return sql`(${sources.domain} in (${sql.join(
        BUDGET_DOMAINS.map((d) => sql`${d}`),
        sql`, `,
      )}) or jsonb_array_length(coalesce(${articles.extractedEntities}->'amounts_mnt', '[]'::jsonb)) > 0)`;
    case "ministry":
      return eq(sources.category, "ministry");
    case "local":
      return eq(sources.category, "local");
    default:
      return undefined;
  }
}

export async function getFeed(filter: FeedFilter, limit = 30): Promise<ArticleListItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles");
  return safe("getFeed", [], async () => {
    const rows = await getDb()
      .select(listColumns)
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(and(visible, filterCondition(filter)))
      .orderBy(...(filter === "risk" ? [desc(articles.riskScore), desc(articles.publishedAt)] : [desc(articles.publishedAt), desc(articles.id)]))
      .limit(limit);
    return rows.map(toListItem);
  });
}

export interface ClusterListItem {
  id: number;
  title: string;
  synthesis: string | null;
  articleCount: number;
  maxRiskScore: number;
  updatedAt: Date;
  sources: string[];
}

export async function getClusters(limit = 30, sinceDays?: number): Promise<ClusterListItem[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("clusters");
  return safe("getClusters", [], async () => {
    const db = getDb();
    const since = sinceDays ? new Date(Date.now() - sinceDays * 86_400_000) : null;
    const rows = await db
      .select()
      .from(clusters)
      .where(and(gte(clusters.articleCount, 2), since ? gte(clusters.updatedAt, since) : undefined))
      .orderBy(desc(clusters.updatedAt))
      .limit(limit);
    if (rows.length === 0) return [];
    const src = await db
      .selectDistinct({ clusterId: articles.clusterId, name: sources.name })
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(inArray(articles.clusterId, rows.map((r) => r.id)));
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      synthesis: r.synthesisSummary,
      articleCount: r.articleCount,
      maxRiskScore: r.maxRiskScore,
      updatedAt: r.updatedAt,
      sources: src.filter((s) => s.clusterId === r.id).map((s) => s.name),
    }));
  });
}

export async function getCluster(id: number) {
  "use cache";
  cacheLife("minutes");
  cacheTag("clusters", `cluster-${id}`);
  return safe("getCluster", null, async () => {
    const db = getDb();
    const [cluster] = await db.select().from(clusters).where(eq(clusters.id, id)).limit(1);
    if (!cluster) return null;
    const rows = await db
      .select(listColumns)
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(and(visible, eq(articles.clusterId, id)))
      .orderBy(desc(articles.publishedAt));
    return { cluster, articles: rows.map(toListItem) };
  });
}

export interface ArticleDetail extends ArticleListItem {
  originalUrl: string;
  contentHash: string;
  cleanContent: string;
  facts: string[];
  spinDetected: string;
  entities: ExtractedEntities;
  deepAnalysis: string | null;
  scrapeMeta: ScrapeMeta | null;
  createdAt: Date;
  editedAt: Date | null;
}

export async function getArticleBySlug(slug: string): Promise<ArticleDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("articles", `article-${slug}`);
  return safe("getArticleBySlug", null, async () => {
    const [r] = await getDb()
      .select({ ...listColumns, originalUrl: articles.originalUrl, contentHash: articles.contentHash, cleanContent: articles.cleanContent, scrapeMeta: articles.scrapeMeta, createdAt: articles.createdAt, editedAt: articles.editedAt })
      .from(articles)
      .innerJoin(sources, eq(articles.sourceId, sources.id))
      .where(and(visible, eq(articles.slug, slug)))
      .limit(1);
    if (!r) return null;
    return {
      ...toListItem(r),
      originalUrl: r.originalUrl,
      contentHash: r.contentHash,
      cleanContent: r.cleanContent,
      facts: r.factVsSpin?.facts ?? [],
      spinDetected: r.factVsSpin?.spin_detected ?? "",
      entities: r.entities ?? { people: [], orgs: [], amounts_mnt: [] },
      deepAnalysis: r.deep,
      scrapeMeta: r.scrapeMeta,
      createdAt: r.createdAt,
      editedAt: r.editedAt,
    };
  });
}

/** Slugs to prerender at build time (most recent). */
export async function getRecentSlugs(limit = 20): Promise<string[]> {
  return safe("getRecentSlugs", [], async () => {
    const rows = await getDb().select({ slug: articles.slug }).from(articles).where(visible).orderBy(desc(articles.publishedAt)).limit(limit);
    return rows.map((r) => r.slug);
  });
}

export interface SiteStats {
  activeSources: number;
  articles: number;
  analyzed: number;
  flagged: number;
  clusters: number;
  aiCostThisMonthUsd: number;
}

export async function getSiteStats(): Promise<SiteStats> {
  "use cache";
  cacheLife("minutes");
  cacheTag("articles", "sources", "ai");
  const fallback: SiteStats = { activeSources: SOURCE_SEEDS.length, articles: 0, analyzed: 0, flagged: 0, clusters: 0, aiCostThisMonthUsd: 0 };
  return safe("getSiteStats", fallback, async () => {
    const db = getDb();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const [[src], [art], [clu], [cost]] = await Promise.all([
      db.select({ n: count() }).from(sources).where(eq(sources.isActive, true)),
      db
        .select({
          total: count(),
          analyzed: sql<number>`count(${articles.tldrSummary})::int`,
          flagged: sql<number>`count(*) filter (where ${articles.riskFlag})::int`,
        })
        .from(articles),
      db.select({ n: count() }).from(clusters).where(gte(clusters.articleCount, 2)),
      db.select({ usd: sql<string>`coalesce(sum(${aiUsageLogs.estimatedCostUsd}), 0)` }).from(aiUsageLogs).where(gte(aiUsageLogs.createdAt, monthStart)),
    ]);
    return {
      activeSources: src.n,
      articles: art.total,
      analyzed: art.analyzed,
      flagged: art.flagged,
      clusters: clu.n,
      aiCostThisMonthUsd: Number(cost.usd),
    };
  });
}

export interface SourceHealth {
  id: number;
  name: string;
  domain: string;
  category: SourceCategory;
  isActive: boolean;
  lastScrapedAt: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
  articleCount: number;
}

export async function getSources(): Promise<SourceHealth[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("sources");
  const fallback: SourceHealth[] = SOURCE_SEEDS.map((s, i) => ({
    id: i + 1,
    name: s.name,
    domain: s.domain,
    category: s.category,
    isActive: true,
    lastScrapedAt: null,
    lastError: null,
    consecutiveFailures: 0,
    articleCount: 0,
  }));
  return safe("getSources", fallback, async () => {
    const db = getDb();
    const counts = db
      .select({ sourceId: articles.sourceId, n: count().as("n") })
      .from(articles)
      .groupBy(articles.sourceId)
      .as("counts");
    const rows = await db
      .select({
        id: sources.id,
        name: sources.name,
        domain: sources.domain,
        category: sources.category,
        isActive: sources.isActive,
        lastScrapedAt: sources.lastScrapedAt,
        lastError: sources.lastError,
        consecutiveFailures: sources.consecutiveFailures,
        articleCount: sql<number>`coalesce(${counts.n}, 0)::int`,
      })
      .from(sources)
      .leftJoin(counts, eq(counts.sourceId, sources.id))
      .orderBy(sources.category, sources.name);
    return rows;
  });
}

export interface TransparencyData {
  dailySpend: { day: string; deepseek: number; grok: number; ollama: number }[];
  byProvider: { provider: string; calls: number; promptTokens: number; completionTokens: number; costUsd: number }[];
  ledger: { month: string; infraCostUsd: number; aiCostUsd: number; adRevenueUsd: number; donationsUsd: number; notes: string | null }[];
  totals: { costUsd: number; calls: number; tokens: number };
}

export async function getTransparency(): Promise<TransparencyData> {
  "use cache";
  cacheLife("minutes");
  cacheTag("ai", "ledger");
  const empty: TransparencyData = { dailySpend: [], byProvider: [], ledger: [], totals: { costUsd: 0, calls: 0, tokens: 0 } };
  return safe("getTransparency", empty, async () => {
    const db = getDb();
    const since = new Date(Date.now() - 30 * 86_400_000);
    const day = sql<string>`to_char(${aiUsageLogs.createdAt} at time zone 'Asia/Ulaanbaatar', 'YYYY-MM-DD')`;
    const [daily, providers, ledger] = await Promise.all([
      db
        .select({ day, provider: aiUsageLogs.provider, usd: sql<string>`sum(${aiUsageLogs.estimatedCostUsd})` })
        .from(aiUsageLogs)
        .where(gte(aiUsageLogs.createdAt, since))
        .groupBy(day, aiUsageLogs.provider)
        .orderBy(day),
      db
        .select({
          provider: aiUsageLogs.provider,
          calls: count(),
          promptTokens: sql<number>`coalesce(sum(${aiUsageLogs.promptTokens}), 0)::bigint`,
          completionTokens: sql<number>`coalesce(sum(${aiUsageLogs.completionTokens}), 0)::bigint`,
          costUsd: sql<string>`coalesce(sum(${aiUsageLogs.estimatedCostUsd}), 0)`,
        })
        .from(aiUsageLogs)
        .groupBy(aiUsageLogs.provider),
      db.select().from(transparencyLedger).orderBy(desc(transparencyLedger.month)).limit(12),
    ]);
    const days = new Map<string, { day: string; deepseek: number; grok: number; ollama: number }>();
    for (const r of daily) {
      const d = days.get(r.day) ?? { day: r.day, deepseek: 0, grok: 0, ollama: 0 };
      d[r.provider] = Number(r.usd);
      days.set(r.day, d);
    }
    const byProvider = providers.map((p) => ({
      provider: p.provider,
      calls: p.calls,
      promptTokens: Number(p.promptTokens),
      completionTokens: Number(p.completionTokens),
      costUsd: Number(p.costUsd),
    }));
    return {
      dailySpend: [...days.values()],
      byProvider,
      ledger: ledger.map((l) => ({
        month: l.month,
        infraCostUsd: Number(l.infraCostUsd),
        aiCostUsd: Number(l.aiCostUsd),
        adRevenueUsd: Number(l.adRevenueUsd),
        donationsUsd: Number(l.donationsUsd),
        notes: l.notes,
      })),
      totals: {
        costUsd: byProvider.reduce((s, p) => s + p.costUsd, 0),
        calls: byProvider.reduce((s, p) => s + p.calls, 0),
        tokens: byProvider.reduce((s, p) => s + p.promptTokens + p.completionTokens, 0),
      },
    };
  });
}
