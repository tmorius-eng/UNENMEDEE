import { and, desc, eq, gte, inArray, isNotNull, ne, sql } from "drizzle-orm";

import type { DB } from "@/db";
import { articles, clusters, sources } from "@/db/schema";
import { extractMntAmounts } from "@/lib/scraper/adapters/tender";

import { CLUSTER_WINDOW_DAYS, findBestMatch, type ClusterDoc } from "./clustering";
import { clusterMessages, tier1Messages, tier2Messages, type ArticleForAI, type ClusterMember } from "./prompts";
import type { BudgetGuard } from "./limits";
import { callAIWithFallback, type Purpose, type UsageLogger } from "./router";
import { ClusterSchema, Tier1Schema, Tier2Schema, type Tier1Result, type Tier2Result } from "./schemas";

export interface AnalysisOutcome {
  tier1: Tier1Result;
  tier1Provider: string;
  tier2: Tier2Result | null;
  tier2Provider: string | null;
  /** Why the deep analysis is missing although it was wanted (limit reached, provider down). */
  tier2Error: string | null;
  costUsd: number;
}

export interface AnalyzeOptions {
  articleId?: number | null;
  log?: UsageLogger;
  budget?: BudgetGuard;
  forceDeep?: boolean;
  purpose?: Purpose;
}

/** Sources whose items are structured metadata: summarized by rules, zero AI tokens. */
const RULE_BASED_DOMAINS = new Set(["opendata.gov.mn"]);

function field(text: string, label: string): string | null {
  const m = text.match(new RegExp(`^${label}:\\s*(.+)$`, "m"));
  return m ? m[1].trim() : null;
}

/** Token-free analysis for opendata.gov.mn dataset entries (they carry no political text). */
export function ruleBasedAnalysis(input: ArticleForAI): Tier1Result | null {
  if (!RULE_BASED_DOMAINS.has(input.sourceDomain)) return null;
  const org = field(input.text, "Эзэмшигч байгууллага");
  const freq = field(input.text, "Шинэчлэгдэх давтамж");
  const formats = field(input.text, "Файлын формат");
  const updated = field(input.text, "Сүүлд шинэчлэгдсэн");
  const lines = [
    `${org ? `${org} ` : ""}"${input.title}" нэртэй нээлттэй өгөгдлийн багц нийтэллээ.`,
    freq ? `Өгөгдөл ${freq.toLowerCase()} шинэчлэгдэнэ.` : null,
    formats ? `Файлыг ${formats} форматаар татаж авах боломжтой.` : null,
  ].filter((l): l is string => Boolean(l));
  return {
    tldr_summary: lines.join("\n"),
    facts: [org && `Эзэмшигч: ${org}`, freq && `Давтамж: ${freq}`, formats && `Формат: ${formats}`, updated && `Шинэчлэгдсэн: ${updated}`].filter(
      (f): f is string => Boolean(f),
    ),
    spin_detected: "Албан ёсны өгөгдлийн бүртгэл тул пи-ар агуулаагүй.",
    neutrality_score: 100,
    entities: { people: [], orgs: org ? [org] : [], amounts_mnt: [] },
    risk_score: 0,
    risk_reason: "Өгөгдлийн багцын мэдээлэл.",
    importance_score: 15,
    topic: null,
    risk_flag: false,
  };
}

/** Regex-found MNT amounts are merged in so money tags never depend on the model alone. */
function withRegexAmounts(t1: Tier1Result, text: string): Tier1Result {
  const amounts = [...new Set([...t1.entities.amounts_mnt, ...extractMntAmounts(text, 8)])].slice(0, 15);
  return { ...t1, entities: { ...t1.entities, amounts_mnt: amounts } };
}

/** Formats Grok's analysis + citizen questions as the stored markdown. */
export function formatDeepAnalysis(t2: Tier2Result): string {
  const questions = t2.citizen_questions.length
    ? `\n\n## Иргэд асуух ёстой асуултууд\n${t2.citizen_questions.map((q) => `- ${q}`).join("\n")}`
    : "";
  return `${t2.analysis_markdown.trim()}${questions}`;
}

/**
 * Tier 1 always; Tier 2 when the risk flag is set (or forced from the admin panel).
 * Pure function of its input + AI calls: no DB writes, so the admin "filter" reuses it.
 */
export async function analyzeArticle(input: ArticleForAI, opts: AnalyzeOptions = {}): Promise<AnalysisOutcome> {
  const rules = opts.forceDeep ? null : ruleBasedAnalysis(input);
  if (rules) return { tier1: rules, tier1Provider: "rule-based", tier2: null, tier2Provider: null, tier2Error: null, costUsd: 0 };

  const t1 = await callAIWithFallback({
    tier: "tier1",
    purpose: opts.purpose ?? "tier1",
    articleId: opts.articleId,
    messages: tier1Messages(input),
    schema: Tier1Schema,
    log: opts.log,
    budget: opts.budget,
  });
  const tier1 = withRegexAmounts(t1.data, input.text);
  let costUsd = t1.costUsd;

  let tier2: Tier2Result | null = null;
  let tier2Provider: string | null = null;
  let tier2Error: string | null = null;
  if (tier1.risk_flag || opts.forceDeep) {
    try {
      const t2 = await callAIWithFallback({
        tier: "tier2",
        purpose: opts.purpose === "admin" ? "admin" : "tier2",
        articleId: opts.articleId,
        messages: tier2Messages(input, tier1),
        schema: Tier2Schema,
        log: opts.log,
        budget: opts.budget,
        maxTokens: 1_800,
        temperature: 0.3,
      });
      tier2 = t2.data;
      tier2Provider = `${t2.provider}/${t2.model}`;
      costUsd += t2.costUsd;
    } catch (err) {
      // Keep the (already paid) Tier-1 result; the deep analysis can be retried from /admin.
      tier2Error = err instanceof Error ? err.message : String(err);
    }
  }
  return { tier1, tier1Provider: `${t1.provider}/${t1.model}`, tier2, tier2Provider, tier2Error, costUsd };
}

/** Loads an article with its source as AI input. */
export async function loadArticleForAI(db: DB, id: number) {
  const [row] = await db
    .select({ article: articles, sourceName: sources.name, sourceDomain: sources.domain })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(eq(articles.id, id))
    .limit(1);
  if (!row) return null;
  const input: ArticleForAI = {
    title: row.article.title,
    sourceName: row.sourceName,
    sourceDomain: row.sourceDomain,
    url: row.article.originalUrl,
    publishedAt: row.article.publishedAt,
    text: row.article.cleanContent,
    meta: row.article.scrapeMeta,
  };
  return { row: row.article, input };
}

/** Runs the full pipeline for one stored article and writes the results. */
export async function processArticle(db: DB, id: number, opts: Omit<AnalyzeOptions, "articleId"> = {}) {
  const loaded = await loadArticleForAI(db, id);
  if (!loaded) throw new Error(`Article ${id} not found`);
  const outcome = await analyzeArticle(loaded.input, { ...opts, articleId: id });
  const { tier1, tier2 } = outcome;
  await db
    .update(articles)
    .set({
      tldrSummary: tier1.tldr_summary,
      factVsSpin: { facts: tier1.facts, spin_detected: tier1.spin_detected, neutrality_score: tier1.neutrality_score },
      extractedEntities: tier1.entities,
      riskScore: tier1.risk_score,
      riskFlag: tier1.risk_flag,
      importanceScore: tier1.importance_score,
      topic: tier1.topic,
      // Keep an earlier deep analysis if this run did not produce a new one.
      ...(tier2 ? { grokDeepAnalysis: formatDeepAnalysis(tier2) } : {}),
      aiError: null,
    })
    .where(eq(articles.id, id));
  const clusterId = await assignCluster(db, id, opts.log, opts.budget);
  return { ...outcome, clusterId };
}

/**
 * Jaccard clustering against processed articles from the last 7 days.
 * Joins the best match's cluster (or creates one) and re-synthesizes the cluster summary.
 */
export async function assignCluster(db: DB, id: number, log?: UsageLogger, budget?: BudgetGuard): Promise<number | null> {
  const since = new Date(Date.now() - CLUSTER_WINDOW_DAYS * 86_400_000);
  const pool = await db
    .select({
      id: articles.id,
      title: articles.title,
      tldr: articles.tldrSummary,
      facts: articles.factVsSpin,
      entities: articles.extractedEntities,
      clusterId: articles.clusterId,
      sourceId: articles.sourceId,
    })
    .from(articles)
    .where(and(isNotNull(articles.tldrSummary), gte(articles.createdAt, since)))
    .orderBy(desc(articles.createdAt))
    .limit(500);

  const toDoc = (r: (typeof pool)[number]): ClusterDoc => ({
    id: r.id,
    title: r.title,
    summary: `${r.tldr ?? ""} ${(r.facts?.facts ?? []).join(" ")}`,
    entities: r.entities,
    clusterId: r.clusterId,
  });
  const me = pool.find((r) => r.id === id);
  if (!me) return null;
  // The same source re-posting is not corroboration; cluster across sources only.
  const match = findBestMatch(toDoc(me), pool.filter((r) => r.sourceId !== me.sourceId).map(toDoc));
  if (!match) return me.clusterId;

  let clusterId = match.doc.clusterId ?? me.clusterId;
  if (!clusterId) {
    const [created] = await db.insert(clusters).values({ title: me.title, articleCount: 0 }).returning({ id: clusters.id });
    clusterId = created.id;
  }
  await db.update(articles).set({ clusterId }).where(inArray(articles.id, [id, match.doc.id]));
  await refreshCluster(db, clusterId, log, budget);
  if (me.clusterId && me.clusterId !== clusterId) await refreshCluster(db, me.clusterId, log, budget);
  return clusterId;
}

/**
 * Re-synthesizing on every join would cost O(n) model calls per cluster. Only refresh
 * at growth milestones: 2, 3, 5, 8, then every 5 articles.
 */
export function shouldResynthesize(previousCount: number, newCount: number): boolean {
  if (newCount < 2 || newCount === previousCount) return false;
  return [2, 3, 5, 8].includes(newCount) || (newCount > 8 && newCount % 5 === 0);
}

/** Recounts a cluster and, at growth milestones, asks the model for a neutral cross-source synthesis. */
export async function refreshCluster(db: DB, clusterId: number, log?: UsageLogger, budget?: BudgetGuard): Promise<void> {
  const members = await db
    .select({ title: articles.title, tldr: articles.tldrSummary, facts: articles.factVsSpin, risk: articles.riskScore, sourceName: sources.name })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(and(eq(articles.clusterId, clusterId), ne(articles.isPublished, false)))
    .orderBy(desc(articles.riskScore));
  if (members.length === 0) {
    // Its articles moved to another cluster (or were unpublished).
    await db.delete(clusters).where(eq(clusters.id, clusterId));
    return;
  }
  const maxRisk = Math.max(...members.map((m) => m.risk));
  const [current] = await db.select({ count: clusters.articleCount }).from(clusters).where(eq(clusters.id, clusterId));

  let title: string | undefined;
  let synthesis: string | undefined;
  if (shouldResynthesize(current?.count ?? 0, members.length)) {
    try {
      const res = await callAIWithFallback({
        // Synthesis is a summary of summaries: the cheap/free bulk tier is enough.
        tier: "tier1",
        purpose: "cluster",
        messages: clusterMessages(
          members.map<ClusterMember>((m) => ({ title: m.title, sourceName: m.sourceName, tldr: m.tldr ?? "", facts: m.facts?.facts ?? [] })),
        ),
        schema: ClusterSchema,
        log,
        budget,
        maxTokens: 600,
      });
      title = res.data.title;
      synthesis = res.data.synthesis;
    } catch {
      /* keep the previous synthesis; counts still update */
    }
  }
  await db
    .update(clusters)
    .set({
      articleCount: members.length,
      maxRiskScore: maxRisk,
      updatedAt: sql`now()`,
      ...(title ? { title } : {}),
      ...(synthesis ? { synthesisSummary: synthesis } : {}),
    })
    .where(eq(clusters.id, clusterId));
}
