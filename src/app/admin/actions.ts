"use server";

import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import { articles, sources, transparencyLedger } from "@/db/schema";
import { analyzeArticle, formatDeepAnalysis, processArticle } from "@/lib/ai/analyze";
import type { ArticleForAI } from "@/lib/ai/prompts";
import { AIUnavailableError } from "@/lib/ai/router";
import { dbBudgetGuard, dbUsageLogger, syncLedgerAiCost } from "@/lib/ai/usage-log";
import { requireAdmin } from "@/lib/admin-auth";
import { extractArticleSafe } from "@/lib/scraper/extract-safe";
import { politeFetch } from "@/lib/scraper/http";
import { contentHash, normalizeText, slugify, truncate } from "@/lib/text";

const MAX_STORED_CHARS = 15_000;

function refreshPublic(slug?: string) {
  updateTag("articles");
  updateTag("clusters");
  updateTag("ai");
  if (slug) updateTag(`article-${slug}`);
}

/* ------------------------------------------------------------------ articles */

export async function togglePublish(formData: FormData) {
  await requireAdmin();
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const db = getDb();
  const [row] = await db.select({ isPublished: articles.isPublished, slug: articles.slug }).from(articles).where(eq(articles.id, id));
  if (!row) return;
  await db.update(articles).set({ isPublished: !row.isPublished }).where(eq(articles.id, id));
  refreshPublic(row.slug);
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

/** Re-runs the pipeline for one article; `deep` forces the Grok tier. */
export async function reanalyze(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const deep = formData.get("deep") === "1";
  const db = getDb();
  try {
    const res = await processArticle(db, id, { log: dbUsageLogger(db), budget: dbBudgetGuard(db), forceDeep: deep, purpose: "admin" });
    await syncLedgerAiCost(db);
    const [row] = await db.select({ slug: articles.slug }).from(articles).where(eq(articles.id, id));
    refreshPublic(row?.slug);
    const deepNote = res.tier2 ? ` · Гүнзгий: ${res.tier2Provider}` : res.tier2Error ? ` · Гүнзгий шинжилгээ хийгдсэнгүй (${res.tier2Error.slice(0, 120)})` : "";
    return { ok: true, message: `Эрсдэл ${res.tier1.risk_score}/100 · ${res.tier1Provider}${deepNote} · $${res.costUsd.toFixed(5)}` };
  } catch (err) {
    const msg = err instanceof AIUnavailableError ? `${err.message}: ${err.attempts.join(" | ")}` : err instanceof Error ? err.message : String(err);
    return { ok: false, message: msg.slice(0, 400) };
  }
}

const ArticleEdit = z.object({
  id: z.coerce.number().int().positive(),
  title: z.string().trim().min(5).max(500),
  tldr: z.string().trim().max(2_000),
  content: z.string().trim().min(50).max(MAX_STORED_CHARS * 2),
  published: z.enum(["on"]).optional(),
});

export async function saveArticle(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = ArticleEdit.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  const { id, title, tldr, content, published } = parsed.data;
  const db = getDb();
  const [current] = await db.select({ cleanContent: articles.cleanContent, slug: articles.slug }).from(articles).where(eq(articles.id, id));
  if (!current) return { ok: false, message: "Нийтлэл олдсонгүй." };
  const newContent = truncate(normalizeText(content), MAX_STORED_CHARS);
  await db
    .update(articles)
    .set({
      title,
      tldrSummary: tldr || null,
      cleanContent: newContent,
      isPublished: published === "on",
      // content_hash keeps proving the original scrape; mark the edit openly instead.
      ...(newContent !== current.cleanContent ? { editedAt: new Date() } : {}),
    })
    .where(eq(articles.id, id));
  refreshPublic(current.slug);
  return { ok: true, message: "Хадгаллаа." };
}

/* ------------------------------------------------------------------ ledger */

const Ledger = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  infraCostUsd: z.coerce.number().min(0).max(1e6),
  adRevenueUsd: z.coerce.number().min(0).max(1e7),
  donationsUsd: z.coerce.number().min(0).max(1e7),
  notes: z.string().max(500).optional(),
});

export async function saveLedger(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = Ledger.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Утгууд буруу байна (сар: YYYY-MM, дүн: 0 ба түүнээс их)." };
  const v = parsed.data;
  const db = getDb();
  await db
    .insert(transparencyLedger)
    .values({ month: v.month, infraCostUsd: v.infraCostUsd.toFixed(2), adRevenueUsd: v.adRevenueUsd.toFixed(2), donationsUsd: v.donationsUsd.toFixed(2), notes: v.notes || null })
    .onConflictDoUpdate({
      target: transparencyLedger.month,
      set: { infraCostUsd: v.infraCostUsd.toFixed(2), adRevenueUsd: v.adRevenueUsd.toFixed(2), donationsUsd: v.donationsUsd.toFixed(2), notes: v.notes || null },
    });
  await syncLedgerAiCost(db, v.month);
  updateTag("ledger");
  return { ok: true, message: `${v.month} сарын бүртгэлийг хадгаллаа.` };
}

/* ------------------------------------------------------------------ anti-brainwash filter */

export interface FilterInput {
  title: string;
  url: string | null;
  sourceDomain: string;
  text: string;
}

export interface FilterResult {
  ok: boolean;
  error?: string;
  input?: FilterInput;
  tldr?: string;
  facts?: string[];
  spin?: string;
  neutrality?: number;
  riskScore?: number;
  riskReason?: string;
  amounts?: string[];
  deepMarkdown?: string | null;
  providers?: string;
  costUsd?: number;
}

/** Fetch a URL (politely) or take raw text, then run DeepSeek and, if risky, Grok. */
export async function runFilter(raw: string, forceDeep: boolean): Promise<FilterResult> {
  await requireAdmin();
  const value = raw.trim();
  if (value.length < 10) return { ok: false, error: "URL эсвэл дор хаяж хэдэн өгүүлбэр оруулна уу." };

  let input: FilterInput;
  if (/^https?:\/\/\S+$/i.test(value)) {
    try {
      const res = await politeFetch(value, { timeoutMs: 25_000 });
      if (!res.ok) return { ok: false, error: `Хуудсыг татаж чадсангүй (HTTP ${res.status}).` };
      const article = await extractArticleSafe(await res.text(), res.url || value);
      if (!article) return { ok: false, error: "Хуудаснаас нийтлэлийн текст олдсонгүй (JavaScript-ээр ачаалдаг сайт байж магадгүй). Текстийг нь хуулж оруулна уу." };
      input = { title: article.title, url: value, sourceDomain: new URL(value).hostname.replace(/^www\./, ""), text: article.text };
    } catch (err) {
      return { ok: false, error: `Татах үед алдаа: ${err instanceof Error ? err.message : String(err)}` };
    }
  } else {
    const text = normalizeText(value);
    const firstLine = text.split("\n")[0].slice(0, 200);
    input = { title: firstLine.length >= 10 ? firstLine : text.slice(0, 120), url: null, sourceDomain: "гараар оруулсан", text };
  }

  const ai: ArticleForAI = { title: input.title, sourceName: input.sourceDomain, sourceDomain: input.sourceDomain, url: input.url ?? "—", publishedAt: null, text: input.text };
  const db = getDb();
  try {
    const out = await analyzeArticle(ai, { log: dbUsageLogger(db), budget: dbBudgetGuard(db), forceDeep, purpose: "admin" });
    await syncLedgerAiCost(db);
    updateTag("ai");
    return {
      ok: true,
      input,
      tldr: out.tier1.tldr_summary,
      facts: out.tier1.facts,
      spin: out.tier1.spin_detected,
      neutrality: out.tier1.neutrality_score,
      riskScore: out.tier1.risk_score,
      riskReason: out.tier1.risk_reason,
      amounts: out.tier1.entities.amounts_mnt,
      deepMarkdown: out.tier2 ? formatDeepAnalysis(out.tier2) : null,
      providers: [out.tier1Provider, out.tier2Provider].filter(Boolean).join(" → "),
      costUsd: out.costUsd,
    };
  } catch (err) {
    const msg = err instanceof AIUnavailableError ? `${err.message}${err.attempts.length ? `: ${err.attempts.join(" | ")}` : ""}` : String(err);
    return { ok: false, error: msg.slice(0, 500) };
  }
}

const PublishPayload = z.object({
  title: z.string().min(5).max(500),
  url: z.string().url().nullable(),
  sourceDomain: z.string().min(1).max(255),
  text: z.string().min(50),
  tldr: z.string().min(10),
  facts: z.array(z.string()),
  spin: z.string(),
  neutrality: z.number().min(0).max(100),
  riskScore: z.number().min(0).max(100),
  amounts: z.array(z.string()),
  deepMarkdown: z.string().nullable(),
});

/** Publishes an analyzed item from the filter without paying for a second AI run. */
export async function publishFiltered(payload: z.input<typeof PublishPayload>): Promise<ActionResult & { slug?: string }> {
  await requireAdmin();
  const p = PublishPayload.safeParse(payload);
  if (!p.success) return { ok: false, message: "Нийтлэх өгөгдөл дутуу байна." };
  const v = p.data;
  const db = getDb();
  const domain = v.url ? new URL(v.url).hostname.replace(/^www\./, "") : "manual.iltod";
  let [source] = await db.select({ id: sources.id }).from(sources).where(eq(sources.domain, domain));
  if (!source) {
    [source] = await db
      .insert(sources)
      .values({ name: v.url ? domain : "Редакцийн оруулга", domain, urlPattern: v.url ? `${new URL(v.url).origin}/` : "https://manual.iltod/", category: "agency", isActive: false, discoveredFrom: "admin" })
      .returning({ id: sources.id });
  }
  const originalUrl = v.url ?? `https://manual.iltod/${contentHash(v.text).slice(0, 16)}`;
  const slug = slugify(v.title, originalUrl);
  const inserted = await db
    .insert(articles)
    .values({
      sourceId: source.id,
      title: v.title,
      slug,
      originalUrl,
      contentHash: contentHash(v.text),
      cleanContent: truncate(v.text, MAX_STORED_CHARS),
      tldrSummary: v.tldr,
      factVsSpin: { facts: v.facts, spin_detected: v.spin, neutrality_score: v.neutrality },
      extractedEntities: { people: [], orgs: [], amounts_mnt: v.amounts },
      riskScore: v.riskScore,
      riskFlag: v.riskScore >= 65,
      grokDeepAnalysis: v.deepMarkdown,
      publishedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ id: articles.id });
  if (!inserted.length) return { ok: false, message: "Энэ URL/текст аль хэдийн нийтлэгдсэн байна." };
  refreshPublic(slug);
  return { ok: true, message: "Нийтэллээ.", slug };
}
