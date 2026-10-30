/**
 * Makes one "15 жилийн өмнө" price video (src/lib/video) and stores it for posting
 * (`npm run social:post -- --mode video`). Daily in .github/workflows/video.yml.
 *
 *   npm run video:make                         # the next good not yet made for the latest NSO month
 *   npm run video:make -- --good beef          # this good (skipped if already made, unless --force)
 *   npm run video:make -- --dry-run --out x.mp4  # render to a file, store nothing (the voice is still billed)
 *
 * One video per good and NSO data month: when every good has one, nothing is made until NSO
 * publishes the next month. Needs DATABASE_URL (the `prices_nso` snapshot) and GEMINI_API_KEY (the
 * voice), ffmpeg and Playwright's Chromium. The voice call passes the AI budget guard and is logged
 * with its cost; a take whose pace is implausible, a spec with a number not from the snapshot or a
 * file too big for /reel stops the run with nothing stored.
 */
import "dotenv/config";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { and, eq, isNotNull, lt, sql } from "drizzle-orm";

import { closeDb, getDb, hasDatabase } from "@/db";
import { indicatorSnapshots, videos } from "@/db/schema";
import { consoleUsageLogger, dbBudgetGuard, dbUsageLogger, syncLedgerAiCost } from "@/lib/ai/usage-log";
import { GOODS, type PricesSnapshot } from "@/lib/budget/prices";
import { narration, priceVideoSpec, verifySpec } from "@/lib/video/price-video";
import type { VideoMeta } from "@/lib/video/posts";
import { analyseAudio, MAX_BYTES, renderVideo } from "@/lib/video/render";
import { sceneHtml } from "@/lib/video/scene-html";
import { buildTimeline, plausibleTake, sentenceStarts, speechBounds } from "@/lib/video/timing";
import { speak } from "@/lib/video/tts";

/** The MP4 is kept this long for the platforms to fetch it from /reel, then cleared. */
export const VIDEO_KEEP_DAYS = 3;

const { values } = parseArgs({
  options: {
    good: { type: "string" },
    force: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    out: { type: "string", default: "video.mp4" },
  },
});
const dry = values["dry-run"];

async function main() {
  if (!hasDatabase()) throw new Error("DATABASE_URL is not set");
  // A dry run may go through a proxy that adds the key itself (local previews).
  const apiKey = process.env.GEMINI_API_KEY?.trim() ?? "";
  if (!apiKey && !dry) throw new Error("GEMINI_API_KEY is not set: the narration needs it");
  const db = getDb();

  if (!dry) {
    const cleared = await db
      .update(videos)
      .set({ mp4: null })
      .where(and(isNotNull(videos.mp4), lt(videos.createdAt, new Date(Date.now() - VIDEO_KEEP_DAYS * 86_400_000))))
      .returning({ id: videos.id });
    if (cleared.length) console.log(`🧹 cleared ${cleared.length} posted video file(s) older than ${VIDEO_KEEP_DAYS} days`);
  }

  const [row] = await db.select({ data: indicatorSnapshots.data }).from(indicatorSnapshots).where(eq(indicatorSnapshots.key, "prices_nso"));
  if (!row) return console.log("🎬 No prices_nso snapshot yet (npm run budget:sync): nothing to make.");
  const snap = row.data as PricesSnapshot;

  const made = new Set((await db.select({ key: videos.key }).from(videos).where(sql`${videos.key} like ${`prices:%:${snap.latestMonth}`}`)).map((r) => r.key));
  const candidates = values.good ? [values.good] : GOODS.map((g) => g.key);
  let spec = null;
  for (const key of candidates) {
    const s = priceVideoSpec(snap, key);
    if (!s) {
      if (values.good) throw new Error(`No video possible for "${key}" (unknown good or not enough data)`);
      continue;
    }
    if (made.has(s.key) && !values.force && !dry) {
      if (values.good) return console.log(`🎬 ${s.key} was already made (--force to make it again).`);
      continue;
    }
    spec = s;
    break;
  }
  if (!spec) return console.log(`🎬 Every good already has a video for ${snap.latestMonth}: waiting for NSO's next month.`);

  const problems = verifySpec(spec);
  if (problems.length) throw new Error(`Spec refused:\n- ${problems.join("\n- ")}`);
  const text = narration(spec);
  console.log(`🎬 ${spec.key}\n   ${text}`);

  const wav = await speak({ text, apiKey, guard: dbBudgetGuard(db), log: dry ? consoleUsageLogger : dbUsageLogger(db) });
  if (!dry) await syncLedgerAiCost(db);
  const { duration, silences } = await analyseAudio(wav);
  const { lead, tail } = speechBounds(silences, duration);
  if (!plausibleTake(text, tail - lead)) throw new Error(`Narration refused: ${(tail - lead).toFixed(1)} s of speech for ${text.length} characters`);
  const starts = sentenceStarts(
    spec.sentences.map((s) => s.say),
    silences,
    duration,
  );
  const timeline = buildTimeline(
    spec.sentences.map((s) => s.scene),
    starts,
    { duration, tail },
    spec.units?.count ?? null,
  );
  const total = timeline.total;
  console.log(`   voice ${duration.toFixed(1)} s · scenes at ${timeline.starts.join(", ")} · ${total} s`);

  const html = sceneHtml(spec, timeline, { fontsDir: path.resolve("src/assets/fonts"), logo: path.resolve("public/icons/icon-192.png") });
  // VIDEO_MUSIC=off drops the soft synthesized beat (the voice and the sound effects stay).
  const music = process.env.VIDEO_MUSIC?.trim().toLowerCase() !== "off";
  let mp4 = await renderVideo({ html, wav, timeline, music });
  if (mp4.length > MAX_BYTES) mp4 = await renderVideo({ html, wav, timeline, music, crf: 27 });
  if (mp4.length > MAX_BYTES) throw new Error(`Video too big for /reel: ${mp4.length} bytes`);
  console.log(`   ✓ ${(mp4.length / 1e6).toFixed(2)} MB, ${total} s`);

  if (dry) {
    await writeFile(values.out, mp4);
    return console.log(`   written to ${values.out} (dry run: nothing stored)`);
  }
  const meta: VideoMeta = { kind: "prices", goodKey: spec.goodKey, title: spec.title, then: spec.then, now: spec.now, yearPct: spec.yearPct, link: spec.link };
  const [stored] = await db
    .insert(videos)
    .values({ key: spec.key, meta, mp4, bytes: mp4.length, durationS: total })
    .onConflictDoUpdate({ target: videos.key, set: { meta, mp4, bytes: mp4.length, durationS: total, createdAt: new Date() } })
    .returning({ id: videos.id });
  console.log(`   stored as video #${stored.id}`);
}

main()
  .catch((err) => {
    console.error(`::error::make-video: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
