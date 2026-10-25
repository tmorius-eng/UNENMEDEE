/**
 * Posts to the ИЛ ТОД МЭДЭЭ Facebook page and Threads account (docs/FACEBOOK.md has the setup).
 *
 *   npm run social:post -- --mode digest            # the newest digest edition (morning / evening)
 *   npm run social:post -- --mode news              # the most important new story, if any
 *   npm run social:post -- --mode news --dry-run    # print, post nothing
 *
 * Facebook needs FB_PAGE_ID (variable) and FB_PAGE_TOKEN (secret). Threads needs THREADS_TOKEN
 * (secret) once: the long-lived token is then kept and refreshed weekly in app_settings
 * (`threads`); a new THREADS_TOKEN secret replaces it. Each platform without credentials is
 * skipped. News: published in the last 24 h, dated, AI-summarized (not the no-AI fallback),
 * importance >= FB_IMPORTANCE_MIN (75) or a risk flag, one per cluster, FB_NEWS_PER_RUN (1) per run
 * and FB_NEWS_PER_DAY (4) per day and platform, so the feeds stay curated, not a firehose.
 */
import "dotenv/config";
import { parseArgs } from "node:util";

import { and, desc, eq, gte, isNotNull, or, sql } from "drizzle-orm";

import { closeDb, getDb, hasDatabase } from "@/db";
import { appSettings, articles, digests, socialPosts, sources } from "@/db/schema";
import { type ArticleForPost, articlePost, type DigestForPost, digestPost, FacebookError, publishToPage } from "@/lib/social/facebook";
import {
  currentState,
  needsRefresh,
  publishThreads,
  refreshToken,
  THREADS_SETTINGS_KEY,
  threadsArticlePost,
  threadsDigestPost,
  type ThreadsState,
} from "@/lib/social/threads";

const { values } = parseArgs({
  options: {
    mode: { type: "string", default: "news" },
    "dry-run": { type: "boolean", default: false },
  },
});
const dry = values["dry-run"];
const IMPORTANCE_MIN = Number(process.env.FB_IMPORTANCE_MIN ?? 75);
const PER_RUN = Number(process.env.FB_NEWS_PER_RUN ?? 1);
const PER_DAY = Number(process.env.FB_NEWS_PER_DAY ?? 4);

type Db = ReturnType<typeof getDb>;

/** One destination: how a digest / story is worded there and how it is published. */
interface Platform {
  name: "facebook" | "threads";
  digest(d: DigestForPost): { preview: string; publish(): Promise<string> };
  article(a: ArticleForPost): { preview: string; publish(): Promise<string> };
}

function facebook(pageId: string, token: string): Platform {
  const make = (post: { message: string; link: string }) => ({
    preview: `${post.link}\n${post.message}`,
    publish: () => publishToPage({ pageId, token, post }),
  });
  return { name: "facebook", digest: (d) => make(digestPost(d)), article: (a) => make(articlePost(a)) };
}

function threads(token: string): Platform {
  const make = (post: { text: string; link: string }) => ({ preview: `${post.link}\n${post.text}`, publish: () => publishThreads({ token, post }) });
  return { name: "threads", digest: (d) => make(threadsDigestPost(d)), article: (a) => make(threadsArticlePost(a)) };
}

/** The Threads token to use, refreshed and stored when it is a week old (not on dry runs). */
async function threadsToken(db: Db): Promise<string | null> {
  const [row] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, THREADS_SETTINGS_KEY));
  let stored: ThreadsState | null = null;
  try {
    stored = row ? (JSON.parse(row.value) as ThreadsState) : null;
  } catch {
    stored = null;
  }
  let state = currentState(stored, process.env.THREADS_TOKEN);
  if (!state) return null;
  if (!dry && needsRefresh(state)) {
    try {
      state = { ...state, token: await refreshToken(state.token), refreshedAt: new Date().toISOString() };
      console.log("🧵 Threads token refreshed (valid 60 more days).");
    } catch (err) {
      console.error(`::warning::Threads token refresh failed: ${err instanceof Error ? err.message : err}`);
    }
  }
  if (!dry && (!stored || stored.token !== state.token || stored.refreshedAt !== state.refreshedAt)) {
    const value = JSON.stringify(state);
    await db.insert(appSettings).values({ key: THREADS_SETTINGS_KEY, value }).onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } });
  }
  return state.token;
}

const notPosted = (platform: string, kind: string, ref: unknown) =>
  sql`not exists (select 1 from ${socialPosts} where ${socialPosts.platform} = ${platform} and ${socialPosts.kind} = ${kind} and ${socialPosts.refId} = ${ref})`;

/** Reserve, post, record the id; a failed post frees the row so the next run can try again. */
async function post(db: Db, p: Platform, kind: "digest" | "article", refId: number, item: { preview: string; publish(): Promise<string> }) {
  console.log(`  → ${p.name} ${kind} #${refId}: ${item.preview.replace(/\n/g, "\n    ")}`);
  if (dry) return;
  const [row] = await db.insert(socialPosts).values({ platform: p.name, kind, refId }).onConflictDoNothing().returning({ id: socialPosts.id });
  if (!row) return console.log("    already posted, skipped");
  try {
    const id = await item.publish();
    await db.update(socialPosts).set({ postId: id }).where(eq(socialPosts.id, row.id));
    console.log(`    ✓ posted ${id}`);
  } catch (err) {
    await db.delete(socialPosts).where(eq(socialPosts.id, row.id));
    throw err;
  }
}

async function postDigest(db: Db, p: Platform) {
  const [d] = await db
    .select()
    .from(digests)
    .where(and(gte(digests.createdAt, new Date(Date.now() - 12 * 3_600_000)), notPosted(p.name, "digest", digests.id)))
    .orderBy(desc(digests.createdAt))
    .limit(1);
  if (!d || d.items.length === 0) return console.log(`📘 ${p.name}: no new digest edition to post.`);
  await post(db, p, "digest", d.id, p.digest(d));
}

async function postNews(db: Db, p: Platform) {
  const [{ today }] = await db
    .select({ today: sql<number>`count(*)::int` })
    .from(socialPosts)
    .where(and(eq(socialPosts.platform, p.name), eq(socialPosts.kind, "article"), gte(socialPosts.createdAt, new Date(Date.now() - 24 * 3_600_000))));
  const room = Math.min(PER_RUN, PER_DAY - today);
  if (room <= 0) return console.log(`📘 ${p.name}: daily news limit reached (${today}/${PER_DAY}).`);
  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      title: articles.title,
      tldr: articles.tldrSummary,
      sourceName: sources.name,
      entities: articles.extractedEntities,
      riskFlag: articles.riskFlag,
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
        notPosted(p.name, "article", articles.id),
        // One post per story: skip articles whose cluster already went out on this platform.
        sql`(${articles.clusterId} is null or not exists (select 1 from ${socialPosts} sp join ${articles} a2 on a2.id = sp.ref_id where sp.platform = ${p.name} and sp.kind = 'article' and a2.cluster_id = ${articles.clusterId}))`,
      ),
    )
    .orderBy(sql`${articles.importanceScore} desc nulls last`, desc(articles.riskScore))
    .limit(room);
  if (rows.length === 0) return console.log(`📘 ${p.name}: no new important story to post.`);
  for (const r of rows) await post(db, p, "article", r.id, p.article({ ...r, tldr: r.tldr ?? "", amounts: r.entities?.amounts_mnt ?? [] }));
}

async function main() {
  if (!hasDatabase()) {
    console.error("✗ DATABASE_URL is not set.");
    process.exitCode = 1;
    return;
  }
  const db = getDb();
  const platforms: Platform[] = [];
  const pageId = process.env.FB_PAGE_ID?.trim();
  const fbToken = process.env.FB_PAGE_TOKEN?.trim();
  if (pageId && fbToken) platforms.push(facebook(pageId, fbToken));
  else if (dry) platforms.push(facebook("dry-run", ""));
  else console.log("📘 Facebook is off: set FB_PAGE_ID (variable) and FB_PAGE_TOKEN (secret), see docs/FACEBOOK.md.");
  const thToken = await threadsToken(db);
  if (thToken) platforms.push(threads(thToken));
  else console.log("🧵 Threads is off: set the THREADS_TOKEN secret, see docs/FACEBOOK.md.");

  const mode = values.mode === "digest" ? "digest" : "news";
  for (const p of platforms) {
    // One platform failing (expired token, rate limit) never stops the other.
    try {
      if (mode === "digest") await postDigest(db, p);
      else await postNews(db, p);
    } catch (err) {
      const hint = err instanceof FacebookError && err.hint ? ` ${err.hint}` : "";
      console.error(`::error::${p.name}: ${err instanceof Error ? err.message : err}${hint}`);
      process.exitCode = 1;
    }
  }
}

main()
  .catch((err) => {
    console.error("✗ Social post failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
