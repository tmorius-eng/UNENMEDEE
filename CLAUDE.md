# Project: IL-TOD (ИЛ ТОД) - Open-Source Anti-Spin & Government Transparency News Platform (Mongolia)

@AGENTS.md

## 1. Mission & Core Philosophy
We are building a 100% transparent, open-source investigative news and public data monitoring platform for Mongolia, designed for **young readers** (fast, visual, mobile-first).
- **Anti-Brainwash Principle:** Separate hard verifiable facts (numbers, dates, laws, tender amounts, entities) from political PR spin.
- **Zero-Cost Infrastructure:** Must run strictly within free tiers (Vercel Hobby, Supabase Free 500MB PostgreSQL + pgvector, GitHub Actions for cron scraping on a public repo).
- **Dual-LLM Intelligence:** a bulk tier for extraction/summarization and a deep tier for high-risk items. Free tiers go first (Groq, Google Gemini, Requesty's free Gemma, NVIDIA NIM); paid DeepSeek / xAI Grok are optional and capped by a USD budget; local Ollama is the last fallback.

## 2. Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack, React 19.3, Server Actions), TypeScript strict mode.
  - `cacheComponents: true` and `partialPrefetching: true` are ON. Cache DB reads with `'use cache'` + `cacheLife(...)` + `cacheTag(...)` (see `src/lib/queries`). Anything reading `cookies()`, `headers()`, `searchParams` or `params` must sit inside `<Suspense>`.
  - Dynamic routes must return at least one entry from `generateStaticParams` (we use a placeholder and `notFound()` it).
  - Route guarding uses `src/proxy.ts` (Next 16 renamed `middleware.ts` to `proxy.ts`).
  - Lint with `eslint .` (`next lint` no longer exists).
- **Design system (mandatory):**
  - **Untitled UI React** (https://www.untitledui.com/react) is the primary component library: React Aria Components + Tailwind CSS v4. Theme tokens live in `src/styles/theme.css`; base components in `src/components/base/**`, application components in `src/components/application/**`. Merge classes with `cx()` from `src/utils/cx.ts`.
  - **ElevenLabs UI** (https://ui.elevenlabs.io) for conversational/AI surfaces: `Message`, `MessageContent`, `MessageAvatar`, `Response`, `Conversation`, `ShimmeringText`, `Orb`. Installed with the shadcn CLI (`components.json`, e.g. `npx shadcn@latest add https://ui.elevenlabs.io/r/message.json`) into `src/components/ui/`. Every AI-generated text block (TL;DR, Grok analysis, cluster synthesis, admin filter chat) renders through `Message` + `Response` (see `src/components/iltod/ai-message.tsx`).
  - The vendored ElevenLabs files were **adapted to Untitled UI tokens** (Untitled's `bg-primary` is the page background, not shadcn's brand color). `avatar.tsx` / `button.tsx` are local, dependency-free shims and `cn()` lives in `src/lib/utils.ts`. Re-running `shadcn add` overwrites these edits: re-apply them, and never let it add the unrelated `cn` npm package.
  - Chart colors: `src/styles/charts.css` (validated categorical slots; every chart has a table view).
  - Animation: `motion` package (`import { motion } from "motion/react"`), the successor to framer-motion.
  - Charts: `recharts`. Icons: `@untitledui/icons` (prefer) and `lucide-react` (only where ElevenLabs code needs it).
- **Database:** Supabase PostgreSQL with `pgvector`, managed via **Drizzle ORM** (`drizzle-orm` + `pg` node-postgres pool, `drizzle-kit`). Never use postgres.js for app queries: its pipelining hangs behind the Supabase transaction pooler (only `scripts/migrate.ts` uses it, sequentially). Schema: `src/db/schema.ts`. Migrations: `drizzle/`.
- **Scraping Engine:** Node.js scripts in `/scripts` using `crawlee`, `cheerio`, `@mozilla/readability`, `jsdom`. Library code in `src/lib/scraper`.
- **AI SDK:** `openai` package with custom `baseURL` for Groq, Requesty, NVIDIA NIM, DeepSeek, xAI Grok and Ollama; Gemini uses its native `generateContent` API via `fetch` (`src/lib/ai/gemini.ts`). Library code in `src/lib/ai`.
- **Admin Editor:** Tiptap (`@tiptap/react`, `@tiptap/starter-kit`).

## 3. Target Data Sources (Phased Approach)
- **Tier 1 (Structured & High-Value):** `opendata.gov.mn` (HTML scraping of dataset listings, no CKAN API), `tender.gov.mn` (procurement invitations & results), `legalinfo.mn` (new resolutions).
- **Tier 2 (Ministries & Agencies):** `zasag.mn`, `mof.gov.mn` (Finance), `mojha.gov.mn` (Justice), `mmhi.gov.mn` (Mining), `med.gov.mn` (Economy), `mfa.gov.mn` (Foreign Affairs), `moh.gov.mn` (Health), `met.gov.mn` (Environment), `iaac.mn` (Anti-Corruption), `audit.mn` (National Audit), plus the remaining ministries seeded in `scripts/seed-sources.ts`.

### Scraper architecture (`src/lib/scraper`)
- `adapters/index.ts`: sources with a public JSON API (opendata.gov.mn, parliament.mn) skip HTML entirely.
- `--days <n>` backfill: WordPress REST `after=`, feed dates, and only items with a known publication date inside the window (undated items would be stored as "today").
- `src/lib/opendata-mn`: opendata.mn datasets via the portal's documented API (`/apiv1/file/{id}`, the URL its "API харах" button gives out). Its robots.txt disallows `/apiv1/` for crawlers; we skip the robots check for these documented API URLs only, keep the 8 s host delay, and sync at most twice a day. Only metadata and small computed highlights are stored (`open_datasets`), never raw rows.
- `crawl.ts`: one Crawlee run for all other sources. Pass 1 = HTTP (WordPress REST API → RSS → link harvesting, homepage fallback). Pass 2 = headless Chromium (Playwright) only for sources whose news needs JavaScript.
- Sources rotate least-recently-scraped first under a time budget; failing sources back off 2^n hours (`consecutive_failures`).
- `robots.ts` + `http.ts`: our own robots parser and 8s-per-host throttle for non-Crawlee fetches.

### AI pipeline (`src/lib/ai`)
- `router.ts`: provider chains. tier1 = Groq → Gemini → Requesty → NVIDIA → DeepSeek → Ollama; tier2 = Grok → Gemini Flash → Groq → Requesty → NVIDIA → DeepSeek → Ollama (override with `AI_TIER1_CHAIN` / `AI_TIER2_CHAIN`). JSON mode + zod validation + one repair retry; one retry after a 429. Every call (success or failure with tokens) is logged with its USD cost via `usage-log.ts`; a provider-reported cost (Requesty) wins over the price table.
- `limits.ts`: budget guard checked before every call. Paid providers (price > 0, and Requesty always) stop at `AI_MONTHLY_BUDGET_USD` ($3) / `AI_DAILY_BUDGET_USD` ($0.30); every provider has `<PROVIDER>_DAILY_MAX_CALLS` (Grok 5) and optional `<PROVIDER>_RPM` throttling. Free providers keep working when money runs out. Never call a provider without passing a guard in production code (`dbBudgetGuard(db)`).
- Token budget: Tier-1 input is cut to 4,000 chars, Tier-2 to 8,000; opendata.gov.mn datasets are summarized by rules (`ruleBasedAnalysis`, 0 tokens).
- `analyze.ts`: `analyzeArticle` (pure, used by admin), `processArticle` (writes DB), `assignCluster`/`refreshCluster`.
- `risk_flag` is derived from `risk_score >= 65`, never trusted from the model. Regex MNT amounts are merged into entities.
- Clustering: stem Jaccard + entity overlap, threshold 0.45, cross-source only, 7-day window; synthesis only at growth milestones.
- Tier 1 also returns `importance_score` (0-100, national significance; optional, null when missing).
- `digest.ts`: "Онцлох тойм". Articles are pre-ranked without AI (`rankScore`: importance, risk, cross-source coverage, source weight), one per cluster, top 40 (70 for "30d") go to the editor model (tier2 chain minus Grok), which picks 10 (20) and writes headlines + "why it matters". Model-invented ids are dropped; with no AI it falls back to the rule-based ranking. "12h" editions skip if one exists < 6 h old and do not repeat stories from the last 3 editions.

## 4. Strict Scraping & Engineering Rules
1. Always check `robots.txt` and enforce a minimum 8-10 second delay between requests to the same `.gov.mn` domain.
2. Compute a `SHA-256` hash of cleaned article text before calling any LLM. Never process duplicate content.
3. Never store raw full-page HTML in Supabase (to protect the 500MB free limit). Store only cleaned text and structured JSON metadata.
4. Track every LLM API call's token usage and estimated USD cost in the `ai_usage_logs` table so the public `/transparency` dashboard is 100% mathematically accurate and live.
5. UI Language: All public UI labels, AI summaries, and analyses MUST be in clean, natural Mongolian (Cyrillic).
6. The site must build and render with **no** `DATABASE_URL` (empty states), so CI and contributors can run `npm run build` without secrets.

## 5. Commands
- `npm run dev` / `npm run build` / `npm run start`
- `npm run check` = `typecheck` + `lint` + `test` (run before every commit)
- `npm run db:generate` (after schema changes) / `npm run db:migrate` / `npm run db:seed`
- `npm run scrape` (`--dry-run`, `--source <d1,d2>`, `--limit <n>`, `--budget <min>`, `--days <n>` backfill, `--no-browser`)
- `npm run sources:discover` (`--dry-run`, `--deep`) finds new *.gov.mn / *.khural.mn sites from hub pages
- `npm run ai:process` (`--limit <n>`, `--budget <min>`, `--id <articleId> [--deep]`, `--sample` = no-DB smoke test of the API keys)
- `npm run digest` (`--kind 12h|30d`, `--force`) writes the AI news digest
- `npm run data:sync` (`--dry-run`) syncs opendata.mn datasets and highlights for `/data`

## 6. Home page (Kagi News style)
- `/` is a narrow reading column: date masthead, digest strip, then `StoryList` (`src/components/iltod/story-list.tsx`): colored topic label, big headline, ✓ read toggle, tap to expand the AI summary inline (opening marks it read), "Бүгдийг уншсан болгох". One entry per cluster. Read marks and the "Tт" text size live in localStorage via `useLocalStorage` (`src/lib/local-store.ts`, useSyncExternalStore; never setState in an effect).
- Topics come from the source domain, not the model (`src/lib/topics.ts`): every seeded domain maps to one topic; aimag/district sites show their own name. `/?f=<topic>` filters the feed. `TopicBar` is pinned to the bottom on phones and inline on desktop.
- The date heading reads the clock, so it must stay inside the request-time part (after `await searchParams`): Cache Components refuses `Date.now()` in prerendered parts.

## 7. PWA & push notifications
- `src/app/manifest.ts` + `public/icons/*` + `src/app/apple-icon.png`: installable app. `public/sw.js` handles push, notification clicks and an offline page; it never caches pages (`/sw.js` is served `no-store`, see `next.config.ts`).
- `src/components/pwa/*`: 🔔 header button (subscribe/unsubscribe) and the phone install banner. iOS only allows push in an app added to the home screen, so the UI explains that first. Sheets are portaled to `<body>` (the sticky header's backdrop-filter traps `position: fixed`).
- Subscriptions: `push_subscriptions` via public server actions in `src/app/push-actions.ts` (zod + push-service host allowlist). The VAPID key pair lives in `app_settings` (read by GitHub Actions through DATABASE_URL); the public key is also `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on Vercel. Never regenerate the pair: subscriptions are bound to it.
- `npm run push:send -- --mode news` (after ai:process): importance >= 70 (`PUSH_IMPORTANCE_MIN`) or risk flag, published < 24 h, `notified_at` null; ONE notification per run (top story + "+N чухал мэдээ"): bursts were partly rejected by Apple. `--mode digest` after each digest. Failures are logged with status and body; dead subscriptions (404/410) are deleted. The 🔔 sheet has a "test notification" button (`sendTestPush`, own endpoint only, 1/min).

## 8. Admin & automation
- Public queries (`src/lib/queries.ts`) time out after `QUERY_TIMEOUT_MS` (10 s) and render the empty state: a hung `'use cache'` function would otherwise fail `next build`.
- Vercel functions run in `sin1` (Singapore, `vercel.json`), next to the Supabase database in ap-southeast-1; keep them in the same region.
- `/admin` is protected by `src/proxy.ts` (optimistic redirect) AND `requireAdmin()` at the top of every admin page and server action (`src/app/admin/actions.ts`). Server actions are callable directly, so never skip the second check.
- `ADMIN_SECRET_PASSWORD` must be 12+ characters; the cookie is an HMAC of it (rotating the password logs everyone out).
- Editing article text sets `edited_at` and the public page says so; `content_hash` keeps proving the original scrape.
- `.github/workflows/autonomous-news-pipeline.yml` (every 2h): migrate → scrape (HTTP + Chromium) → AI. `news-digest.yml` (08:07 / 20:07 Ulaanbaatar): opendata.mn sync + 12h digest; manual run with `kind=30d` for a monthly review. `discover-sources.yml` (weekly). The pipeline's manual run takes `days` for a backfill. `ci.yml`: check + build without secrets. Workflow inputs reach shell scripts only through `env:`.

## 9. MCP
`.mcp.json` registers the Supabase MCP server for project `boyhogngfxynhirkjdqb`. Authenticate once locally with `claude /mcp` → supabase → Authenticate.
