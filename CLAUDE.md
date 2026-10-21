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
  - **ElevenLabs UI** (https://ui.elevenlabs.io) for conversational/AI surfaces: `Message`, `MessageContent`, `MessageAvatar`, `Response`, `Conversation`, `ShimmeringText` (the three.js `Orb` was removed: unused, heavy). Installed with the shadcn CLI (`components.json`, e.g. `npx shadcn@latest add https://ui.elevenlabs.io/r/message.json`) into `src/components/ui/`. Every AI-generated text block (TL;DR, deep analysis, cluster synthesis, admin filter chat) renders through `Message` (+ `Response` for Markdown) (see `src/components/iltod/ai-message.tsx`).
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
- `adapters/index.ts`: sources with a public API or feed skip HTML crawling: opendata.gov.mn, parliament.mn, zasag.mn (= `mongolia.gov.mn/feed` RSS with full HTML; zasag.mn's own cert and /news are broken, links are rewritten to mongolia.gov.mn) and legalinfo.mn (new legal acts via `POST /mn/ajaxLlist/`, text from the detail page's `.maincontenter`; `ScrapedItem.loadText` fetches details only for unseen URLs) and police.gov.mn (`/a/?page=1&size=20` cards → `/a/{id}`; the list has only the image-path day, `loadText` returns the text plus the exact time; image-only posts have no text and are skipped).
- tender.gov.mn and shilendans.gov.mn are `is_active = false` (Cloudflare 403 / no news). Do not try to get around Cloudflare; shilendans' JSON API (`back.shilendans.gov.mn/proxy/`) is a future budget-data source, not news.
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
- Tier 1 also returns `importance_score` (0-100, national significance; optional, null when missing) and `topic` (one of `AI_TOPIC_KEYS`, unknown → null). `npm run ai:topics` tags older articles 25 headlines per call (runs after ai:process in the pipeline, a no-op when all are tagged).
- The article page names the model that really wrote each block (latest successful `tier1` / `tier2` call in `ai_usage_logs`, `aiModelLabel()`); never hardcode a provider name in reader-facing copy.
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
- `npm run officials:sync` (`--dry-run`, `--limit n`) syncs MPs and their ХАСХОМ declarations
- `npm run macro:sync` (`--dry-run`) stores Mongolbank's policy rate, inflation, FX, gold and reserves
- `npm run budget:sync` (`--dry-run`) stores the budget data for `/budget` (NSO, Шилэн данс, World Bank, audit.mn)

## 6. Home page (Kagi News style)
- `/` is a narrow reading column: date masthead, digest strip, then `StoryList` (`src/components/iltod/story-list.tsx`): colored topic label, big headline, ✓ read toggle, tap to expand the AI summary inline (opening marks it read), "Бүгдийг уншсан болгох". One entry per cluster. Read marks and the "Tт" text size live in localStorage via `useLocalStorage` (`src/lib/local-store.ts`, useSyncExternalStore; never setState in an effect).
- Topics (`src/lib/topics.ts` `topicFor`, mirrored in SQL by `EFFECTIVE_TOPIC` in `queries.ts`): aimag/district sites stay local (and show their own name), opendata.gov.mn stays "data"; otherwise the AI's `articles.topic` wins over the source domain (gov.mn posts everything), with the domain as fallback. Feeds hide `importance_score < FEED_MIN_IMPORTANCE` (25) except `/topic/risk` and `/topic/data`. Each feed filter is its own prerendered page `/topic/<key>` (old `/?f=<key>` links 308-redirect in `next.config.ts`). `TopicBar` is pinned to the bottom on phones and inline on desktop.
- `/` and `/topic/<key>` render `HomeFeed` (`src/components/iltod/home-feed.tsx`) from cached queries only, so they are fully static (CDN, metadata in `<head>`). Never read `searchParams`, `cookies()` or the clock outside `'use cache'` there: the date heading is a `'use cache'` function.
- Reading habit: `src/lib/read-state.ts` holds the shared read list (`iltod-read`, used by StoryList and /digest) and the streak (`iltod-streak`, Ulaanbaatar days). The newest /digest edition (`DigestView track`) shows "N/10 уншсан", a ✓ per story and "🔥 N өдөр дараалан"; finishing an edition bumps the streak. Browser-only; the clock is read via `useSyncExternalStore` (server snapshot "") so prerendered HTML never depends on it. The home digest strip stays server-only.
- Headlines are real `<a href="/article/…">` links (crawlable, Cmd/Ctrl-click opens a tab); a plain tap expands in place.

## 6c. Performance budget (PageSpeed mobile)
- Keep heavy client libraries off shared and home bundles. `AIMessage` must not import streamdown (`Response`): markdown blocks use `AIMarkdownMessage` (`ai-markdown.tsx`). Header, StoryList and PWA sheets animate with CSS (`tailwindcss-animate` `animate-in …`), not `motion`. `Empty` is plain markup (Untitled's EmptyState pulled ~200 KB of illustrations; its file-icons loader ~470 KB).
- Check with Lighthouse before merging UI work: `npx lighthouse <url> --form-factor=mobile`. Text needs 4.5:1 contrast: topic labels use `utility-*-700`, the logo's teal is `#047c78` in light mode.
- `experimental.inlineCss` was measured and rejected: the 197 KB theme CSS was inlined three times (670 KB HTML).

## 6b. SEO
- `src/lib/site.ts` is the one source for `SITE_URL` (`NEXT_PUBLIC_SITE_URL` → `VERCEL_PROJECT_PRODUCTION_URL`), title, description and Mongolian keywords.
- `robots.ts` (disallows `/admin`), `sitemap.ts` (pages, topics `/topic/<key>`, every article), `news-sitemap.xml` (Google News, last 48 h), `feed.xml` (RSS).
- Every public page sets its own `alternates.canonical`. Never put a canonical or `openGraph.url` in the root layout: children inherit it and every page would point at `/`.
- JSON-LD: `NewsMediaOrganization` + `WebSite` in the layout, `NewsArticle` + `BreadcrumbList` on articles (`jsonLd()` escapes `<`).
- OG images: `src/lib/og.tsx` (next/og) with Inter 700 WOFF subsets in `src/assets/fonts`. Satori keeps one font per family name, so each subset has its own name.
- Search Console: set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (and optionally `NEXT_PUBLIC_BING_SITE_VERIFICATION`) on Vercel, then submit `/sitemap.xml` and `/news-sitemap.xml`.

## 6d. Officials & civic data (facts only)
- Rule: show official records with their source link; never let AI or copy accuse anyone. Computed markers are neutral ("анхаарах өөрчлөлт" with numbers, `src/lib/officials/flags.ts`).
- `npm run officials:sync` (`--dry-run`, `--limit n`): parliament.mn `api/parliament_members_list/` + `api/parliament_member/detail/{id}/` (its `hom_url` links the ХАСХОМ id) → `politicians`; IAAC `xacxom.iaac.mn/api/public/xacxom/{id}` (last 5 years, thousand ₮ → ₮) → `asset_declarations`. Name search (`/api/public/xacxom/search`) only when `hom_url` is missing and the name is unique. Weekly workflow `officials-sync.yml`. Members missing from a full roster read become `is_active=false` (kept), so elections need no code change.
- "Миний гишүүн": `/officials` has an aimag/district picker (areas come from `politicians.constituency`) and ⭐ follow buttons (also on `/officials/[id]`). Follows live in localStorage (`iltod-follow`) and, once push is on, in `push_subscriptions.follow_politicians` (`setFollows` action). `push:send --mode news` sends each follower ONE alert when followed MPs are named in articles of the last 24 h (`articles.mention_notified_at`); the builder is `follow-alerts.ts`. Keep `src/lib/officials/follow.ts` free of zod/push imports: the header's PWA hook reaches it and it would bloat every page.
- `/tax` "Миний татвар": the reader's monthly ХХОАТ + НДШ (or a labelled estimate: НДШ 11.5%, ХХОАТ 10% after НДШ) plus VAT in purchases (price/11), split by the latest NSO economic spending structure. Client-only maths (`src/lib/tax/receipt.ts`); 2026 PIT changes are not modelled because the law text is unverified.
- Sharing: `ShareButton` menu (system sheet, Facebook, Messenger deep link on phones, Instagram/Facebook Story = `/story-image?p=<path>` 1080×1920 PNG shared as a file + link copied, Reddit r/mongolia, X, copy). `/story-image` renders text only from our own data (404 otherwise); nothing is stored, the CDN caches it.
- Pages: `/officials` (party filter, sort) and `/officials/[id]` (yearly table, chart, flags, news mentions via `extracted_entities.people` = `short_name` like "Ж.Алдаржавхлан").
- `npm run macro:sync` (`--dry-run`): Mongolbank homepage indicators from the JSON endpoints its site calls (`POST https://www.mongolbank.mn/mn/{policy-interest-rate,inflation,currency-rates,gold-and-silver-price,international-reserves}/data?startDate&endDate`, body `{}`, comma numbers) → `indicator_snapshots` key `mongolbank`. Runs in `news-digest.yml`. `MacroStrip` (server-only markup) shows it on `/` (compact, under the masthead) and `/data` (with series charts). Its "Дэлгэрэнгүй" link has `prefetch={false}`: prefetching /data pulled the chart library (111 KB) into every home visit.
- `npm run budget:sync` (`--dry-run`) → `indicator_snapshots` keys `budget_nso`, `shilendans`, `worldbank_tax`, `audit_opinions` (a failing job keeps its previous snapshot). Runs in `news-digest.yml`. Sources (`src/lib/budget`):
  - NSO PX-Web (`data.1212.mn/api/v1/mn/NSO/Economy, environment/Government budget/*.px`, POST json-stat2, read by `jsonstat.ts`): `DT_NSO_0800_001V1` revenue/expenditure/balance since 1990 (million ₮, actual results, not the approved plan); `001V3` spending: codes 2–14 (economic split) + 15–32 (programmes) add up to the total, so programmes are never shown as total health/education spending; `003V1` revenue: the listed lines add up to the balanced revenue (code 4), the mining funds (codes 1–3) come on top; `DT_NSO_0700_028V1` government debt (billion ₮, quarterly).
  - Шилэн данс back-end (`back.shilendans.gov.mn/proxy/gap-integration-service/integrationECopyCredits/getTopTen|getEZAListByDateBetween`): this year's top payees and categories.
  - World Bank `GC.TAX.TOTL.GD.ZS` (tax % of GDP). audit.mn register (`/audit?audit_opinion_type=…`, HTML): adverse / disclaimer / qualified opinions. audit.mn omits its RapidSSL intermediate: the workflow sets `NODE_EXTRA_CA_CERTS=certs/rapidssl-tls-rsa-ca-g1.pem` (DigiCert's public intermediate, valid to 2027-11; never disable TLS verification).
  - `governments.ts`: Prime Ministers and parties by date, only to label budget years. The page says outright that outcomes are not attributed to a person or party.
- opendatalab.mn is a secondary copy (its terms require checking the primary source): not used.

## 6e. Donations ("Дэмжих")
- The bank account lives in `app_settings` key `donation` (JSON `{bank, account, holder}`), edited in /admin (`saveDonation`, `requireAdmin`, IBAN `MN` + 18 digits or 8–20 digits, `updateTag("settings")` so pages update at once). `getDonation()` falls back to `DEFAULT_DONATION` in `src/lib/donation.ts` (no DB / malformed value).
- Shown responsively: header gap below xl (sm pill → md + account + copy → lg + bank), the top strip at xl+, the mobile menu link, a footer card, and `/support` (what donations pay for; amounts go to the /transparency ledger). The copy button copies the raw account (no spaces).

## 7. PWA & push notifications
- `src/app/manifest.ts` + `public/icons/*` + `src/app/apple-icon.png`: installable app. `public/sw.js` handles push, notification clicks and an offline page; it never caches pages (`/sw.js` is served `no-store`, see `next.config.ts`).
- `src/components/pwa/*`: 🔔 header button (subscribe/unsubscribe) and the phone install banner. iOS only allows push in an app added to the home screen, so the UI explains that first. Sheets are portaled to `<body>` (the sticky header's backdrop-filter traps `position: fixed`).
- Subscriptions: `push_subscriptions` via public server actions in `src/app/push-actions.ts` (zod + push-service host allowlist). The VAPID key pair lives in `app_settings` (read by GitHub Actions through DATABASE_URL); the public key is also `NEXT_PUBLIC_VAPID_PUBLIC_KEY` on Vercel. Never regenerate the pair: subscriptions are bound to it.
- `npm run push:send -- --mode news` (after ai:process): importance >= 70 (`PUSH_IMPORTANCE_MIN`) or risk flag, published < 24 h, `notified_at` null; ONE notification per run (top story + "+N чухал мэдээ"): bursts were partly rejected by Apple. `--mode digest` after each digest. Failures are logged with status and body; dead subscriptions (404/410) are deleted. The 🔔 sheet has a "test notification" button (`sendTestPush`, own endpoint only, 1/min).

## 8. Admin & automation
- Public queries (`src/lib/queries.ts`) time out after `QUERY_TIMEOUT_MS` (10 s) and render the empty state: a hung `'use cache'` function would otherwise fail `next build`.
- Production domain: `https://iltodmedee.mn` (Porkbun DNS: apex A records + `www` CNAME to Vercel; Let's Encrypt cert auto-renews). `www` and `unenmedee.vercel.app` 308-redirect to it; `NEXT_PUBLIC_SITE_URL` is set on Vercel. Do not proxy it through Cloudflare (orange cloud): Vercel is already the CDN, and a second proxy breaks cert renewal and caching.
- Vercel functions run in `sin1` (Singapore, `vercel.json`), next to the Supabase database in ap-southeast-1; keep them in the same region.
- `/admin` is protected by `src/proxy.ts` (optimistic redirect) AND `requireAdmin()` at the top of every admin page and server action (`src/app/admin/actions.ts`). Server actions are callable directly, so never skip the second check.
- Login/logout live in `src/app/admin/auth-actions.ts`, apart from the heavy actions: jsdom failed to load on Vercel (ERR_REQUIRE_ESM) and took the whole actions module, login included, down with it. jsdom is only imported lazily through `extractArticleSafe` (cheerio fallback).
- `ADMIN_SECRET_PASSWORD` must be 12+ characters; the cookie is `<issuedAt>.<HMAC>` and expires after 7 days (`SESSION_MAX_AGE_S`); rotating the password logs everyone out.
- URLs typed by a person (admin "analyze this URL") go through `fetchPublicUrl` (`src/lib/scraper/public-url.ts`): http(s) on 80/443 only, every redirect hop re-checked, private/loopback/link-local/metadata IPs refused (SSRF).
- `subscribePush` is public: 10 per IP per hour (per instance), `PUSH_NEW_PER_HOUR` (500) new rows per hour and `PUSH_MAX_SUBSCRIPTIONS` (50k) in total, so nobody can fill the free database.
- Editing article text sets `edited_at` and the public page says so; `content_hash` keeps proving the original scrape.
- `.github/workflows/autonomous-news-pipeline.yml` (every 2h): migrate → scrape (HTTP + Chromium) → AI. `news-digest.yml` (08:07 / 20:07 Ulaanbaatar): opendata.mn sync + 12h digest; manual run with `kind=30d` for a monthly review. `discover-sources.yml` (weekly). The pipeline's manual run takes `days` for a backfill. `ci.yml`: check + build without secrets. Workflow inputs reach shell scripts only through `env:`.

## 9. MCP
`.mcp.json` is git-ignored (it named the Supabase project). To use the Supabase MCP server locally, create it with `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<your-project-ref>"`, then `claude /mcp` → supabase → Authenticate.
- The public site does not link to the repository (header, footer and JSON-LD carry no GitHub URL); the scraper's User-Agent and the VAPID subject point to https://iltodmedee.mn.
