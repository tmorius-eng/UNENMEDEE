import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import type { ExtractedEntities, FactVsSpin, ScrapeMeta } from "@/lib/types";

export const sourceCategory = pgEnum("source_category", ["portal", "ministry", "agency", "local"]);
export const aiProvider = pgEnum("ai_provider", ["deepseek", "grok", "ollama"]);

export const sources = pgTable("sources", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  domain: varchar("domain", { length: 255 }).notNull().unique(),
  /** Listing path or full URL the adapter starts crawling from. */
  urlPattern: text("url_pattern").notNull(),
  category: sourceCategory("category").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
  /** Last scrape error message (null after a successful run). */
  lastError: text("last_error"),
  /** Consecutive failed runs. The scraper backs off exponentially on dead sites. */
  consecutiveFailures: integer("consecutive_failures").notNull().default(0),
  /** "seed" or the hub URL where `discover-sources` found this domain. */
  discoveredFrom: text("discovered_from").notNull().default("seed"),
});

export const clusters = pgTable("clusters", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  synthesisSummary: text("synthesis_summary"),
  articleCount: integer("article_count").notNull().default(0),
  maxRiskScore: integer("max_risk_score").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const articles = pgTable(
  "articles",
  {
    id: serial("id").primaryKey(),
    sourceId: integer("source_id")
      .notNull()
      .references(() => sources.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    originalUrl: text("original_url").notNull().unique(),
    contentHash: varchar("content_hash", { length: 64 }).notNull(),
    cleanContent: text("clean_content").notNull(),
    /** Small structured hints from the scraper adapter (not raw HTML). */
    scrapeMeta: jsonb("scrape_meta").$type<ScrapeMeta>(),
    tldrSummary: text("tldr_summary"),
    factVsSpin: jsonb("fact_vs_spin").$type<FactVsSpin>(),
    extractedEntities: jsonb("extracted_entities").$type<ExtractedEntities>(),
    riskFlag: boolean("risk_flag").notNull().default(false),
    riskScore: integer("risk_score").notNull().default(0),
    grokDeepAnalysis: text("grok_deep_analysis"),
    clusterId: integer("cluster_id").references(() => clusters.id, { onDelete: "set null" }),
    /** Set when the AI pipeline gave up on this article, so it is not retried forever. */
    aiError: text("ai_error"),
    isPublished: boolean("is_published").notNull().default(true),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("articles_content_hash_idx").on(t.contentHash),
    index("articles_source_id_idx").on(t.sourceId),
    index("articles_cluster_id_idx").on(t.clusterId),
    index("articles_risk_idx").on(t.riskFlag, t.riskScore),
    index("articles_published_at_idx").on(t.publishedAt),
    index("articles_created_at_idx").on(t.createdAt),
  ],
);

export const aiUsageLogs = pgTable(
  "ai_usage_logs",
  {
    id: serial("id").primaryKey(),
    provider: aiProvider("provider").notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    /** What the call was for: tier1 | tier2 | cluster | admin. */
    purpose: varchar("purpose", { length: 32 }),
    articleId: integer("article_id").references(() => articles.id, { onDelete: "set null" }),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    estimatedCostUsd: numeric("estimated_cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    success: boolean("success").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_usage_logs_created_at_idx").on(t.createdAt), index("ai_usage_logs_provider_idx").on(t.provider)],
);

export const transparencyLedger = pgTable("transparency_ledger", {
  id: serial("id").primaryKey(),
  /** e.g. "2026-10" */
  month: varchar("month", { length: 7 }).notNull().unique(),
  infraCostUsd: numeric("infra_cost_usd", { precision: 10, scale: 2 }).notNull().default("0"),
  aiCostUsd: numeric("ai_cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
  adRevenueUsd: numeric("ad_revenue_usd", { precision: 10, scale: 2 }).notNull().default("0"),
  donationsUsd: numeric("donations_usd", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
});

export const sourcesRelations = relations(sources, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  source: one(sources, { fields: [articles.sourceId], references: [sources.id] }),
  cluster: one(clusters, { fields: [articles.clusterId], references: [clusters.id] }),
}));

export const clustersRelations = relations(clusters, ({ many }) => ({
  articles: many(articles),
}));

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
export type Article = typeof articles.$inferSelect;
export type NewArticle = typeof articles.$inferInsert;
export type Cluster = typeof clusters.$inferSelect;
export type AIUsageLog = typeof aiUsageLogs.$inferSelect;
export type LedgerRow = typeof transparencyLedger.$inferSelect;
