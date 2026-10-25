/**
 * Posts to the ИЛ ТОД МЭДЭЭ Facebook page (docs/FACEBOOK.md has the one-time token setup).
 *
 *   npm run social:post -- --mode digest            # the newest digest edition (morning / evening)
 *   npm run social:post -- --mode news              # the most important new story, if any
 *   npm run social:post -- --mode news --dry-run    # print, post nothing
 *
 * Needs FB_PAGE_ID (repository variable) and FB_PAGE_TOKEN (secret); without them it does
 * nothing. News: published in the last 24 h, dated, AI-summarized (not the no-AI fallback),
 * importance >= FB_IMPORTANCE_MIN (75) or a risk flag, one per cluster, FB_NEWS_PER_RUN (1) per run
 * and FB_NEWS_PER_DAY (4) per day, so the page stays a curated feed, not a firehose.
 */
import "dotenv/config";
import { parseArgs } from "node:util";

import { and, desc, eq, gte, isNotNull, or, sql } from "drizzle-orm";

import { closeDb, getDb, hasDatabase } from "@/db";
import { articles, digests, socialPosts, sources } from "@/db/schema";
import { articlePost, digestPost, type FacebookPost, FacebookError, publishToPage } from "@/lib/social/facebook";

const { values } = parseArgs({
  options: {
    mode: { type: "string", default: "news" },
    "dry-run": { type: "boolean", default: false },
  },
});
const dry = values["dry-run"];
const PLATFORM = "facebook";
const IMPORTANCE_MIN = Number(process.env.FB_IMPORTANCE_MIN ?? 75);
const PER_RUN = Number(process.env.FB_NEWS_PER_RUN ?? 1);
const PER_DAY = Number(process.env.FB_NEWS_PER_DAY ?? 4);

type Db = ReturnType<typeof getDb>;

/** Reserve, post, record the id; a failed post frees the row so the next run can try again. */
async function post(db: Db, kind: "digest" | "article", refId: number, item: FacebookPost, pageId: string, token: string): Promise<boolean> {
  console.log(`  → ${kind} #${refId}: ${item.link}\n${item.message.replace(/^/gm, "    ")}`);
  if (dry) return true;
  const [row] = await db.insert(socialPosts).values({ platform: PLATFORM, kind, refId }).onConflictDoNothing().returning({ id: socialPosts.id });
  if (!row) {
    console.log("    already posted, skipped");
    return false;
  }
  try {
    const id = await publishToPage({ pageId, token, post: item });
    await db.update(socialPosts).set({ postId: id }).where(eq(socialPosts.id, row.id));
    console.log(`    ✓ posted ${id}`);
    return true;
  } catch (err) {
    await db.delete(socialPosts).where(eq(socialPosts.id, row.id));
    throw err;
  }
}

async function postDigest(db: Db, pageId: string, token: string) {
  const [d] = await db
    .select()
    .from(digests)
    .where(and(gte(digests.createdAt, new Date(Date.now() - 12 * 3_600_000)), sql`not exists (select 1 from ${socialPosts} where ${socialPosts.platform} = ${PLATFORM} and ${socialPosts.kind} = 'digest' and ${socialPosts.refId} = ${digests.id})`))
    .orderBy(desc(digests.createdAt))
    .limit(1);
  if (!d || d.items.length === 0) return console.log("📘 No new digest edition to post.");
  await post(db, "digest", d.id, digestPost(d), pageId, token);
}

async function postNews(db: Db, pageId: string, token: string) {
  const [{ today }] = await db
    .select({ today: sql<number>`count(*)::int` })
    .from(socialPosts)
    .where(and(eq(socialPosts.platform, PLATFORM), eq(socialPosts.kind, "article"), gte(socialPosts.createdAt, new Date(Date.now() - 24 * 3_600_000))));
  const room = Math.min(PER_RUN, PER_DAY - today);
  if (room <= 0) return console.log(`📘 Daily Facebook news limit reached (${today}/${PER_DAY}).`);
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      tldr: articles.tldrSummary,
      sourceName: sources.name,
      entities: articles.extractedEntities,
      riskFlag: articles.riskFlag,
      clusterId: articles.clusterId,
    })
    .from(articles)
    .innerJoin(sources, eq(articles.sourceId, sources.id))
    .where(
      and(
        eq(articles.isPublished, true),
        isNotNull(articles.tldrSummary),
        eq(articles.summaryFallback, false),
        gte(articles.publishedAt, new Date(Date.now() - 24 * 3_600_000)),
        sql`coalesce((${articles.scrapeMeta}->>'date_unknown')::boolean, false) = false`,
        or(gte(articles.importanceScore, IMPORTANCE_MIN), eq(articles.riskFlag, true)),
        sql`not exists (select 1 from ${socialPosts} where ${socialPosts.platform} = ${PLATFORM} and ${socialPosts.kind} = 'article' and ${socialPosts.refId} = ${articles.id})`,
        // One post per story: skip articles whose cluster already went out.
        sql`(${articles.clusterId} is null or not exists (select 1 from ${socialPosts} sp join ${articles} a2 on a2.id = sp.ref_id where sp.platform = ${PLATFORM} and sp.kind = 'article' and a2.cluster_id = ${articles.clusterId}))`,
      ),
    )
    .orderBy(sql`${articles.importanceScore} desc nulls last`, desc(articles.riskScore))
    .limit(room);
  if (rows.length === 0) return console.log("📘 No new important story to post.");
  for (const r of rows) {
    await post(db, "article", r.id, articlePost({ ...r, tldr: r.tldr ?? "", amounts: r.entities?.amounts_mnt ?? [] }), pageId, token);
  }
}

async function main() {
  const pageId = process.env.FB_PAGE_ID?.trim();
  const token = process.env.FB_PAGE_TOKEN?.trim();
  if (!hasDatabase()) {
    console.error("✗ DATABASE_URL is not set.");
    process.exitCode = 1;
    return;
  }
  if (!dry && (!pageId || !token)) {
    console.log("📘 Facebook posting is off: set FB_PAGE_ID (variable) and FB_PAGE_TOKEN (secret), see docs/FACEBOOK.md.");
    return;
  }
  const db = getDb();
  const mode = values.mode === "digest" ? "digest" : "news";
  try {
    if (mode === "digest") await postDigest(db, pageId ?? "", token ?? "");
    else await postNews(db, pageId ?? "", token ?? "");
  } catch (err) {
    if (err instanceof FacebookError) {
      console.error(`::error::${err.message}${err.hint ? ` ${err.hint}` : ""}`);
      process.exitCode = 1;
      return;
    }
    throw err;
  }
}

main()
  .catch((err) => {
    console.error("✗ Facebook post failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
