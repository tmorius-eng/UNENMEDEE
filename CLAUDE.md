# Project: IL-TOD (ИЛ ТОД) - Open-Source Anti-Spin & Government Transparency News Platform (Mongolia)

@AGENTS.md

## 1. Mission & Core Philosophy
We are building a 100% transparent, open-source investigative news and public data monitoring platform for Mongolia, designed for **young readers** (fast, visual, mobile-first).
- **Anti-Brainwash Principle:** Separate hard verifiable facts (numbers, dates, laws, tender amounts, entities) from political PR spin.
- **Zero-Cost Infrastructure:** Must run strictly within free tiers (Vercel Hobby, Supabase Free 500MB PostgreSQL + pgvector, GitHub Actions for cron scraping on a public repo).
- **Dual-LLM Intelligence:** DeepSeek API for high-volume initial extraction/summarization, xAI Grok API for deep investigative analysis on high-risk items, Local Ollama as a zero-cost fallback.

## 2. Tech Stack
- **Framework:** Next.js 16 (App Router, Turbopack, React 19.3, Server Actions), TypeScript strict mode.
  - `cacheComponents: true` and `partialPrefetching: true` are ON. Cache DB reads with `'use cache'` + `cacheLife(...)` + `cacheTag(...)` (see `src/lib/queries`). Anything reading `cookies()`, `headers()`, `searchParams` or `params` must sit inside `<Suspense>`.
  - Dynamic routes must return at least one entry from `generateStaticParams` (we use a placeholder and `notFound()` it).
  - Route guarding uses `src/proxy.ts` (Next 16 renamed `middleware.ts` to `proxy.ts`).
  - Lint with `eslint .` (`next lint` no longer exists).
- **Design system (mandatory):**
  - **Untitled UI React** (https://www.untitledui.com/react) is the primary component library: React Aria Components + Tailwind CSS v4. Theme tokens live in `src/styles/theme.css`; base components in `src/components/base/**`, application components in `src/components/application/**`. Merge classes with `cx()` from `src/utils/cx.ts`.
  - **ElevenLabs UI** (https://ui.elevenlabs.io) for conversational/AI surfaces: `Message`, `MessageContent`, `MessageAvatar`, `Response`, `Conversation`, `ShimmeringText`, `Orb`. Vendored under `src/components/elevenlabs/` via `npm run ui:sync-elevenlabs`; every AI-generated text block (TL;DR, Grok analysis, admin filter chat) renders through `Message` + `Response`.
  - Animation: `motion` package (`import { motion } from "motion/react"`), the successor to framer-motion.
  - Charts: `recharts`. Icons: `@untitledui/icons` (prefer) and `lucide-react` (only where ElevenLabs code needs it).
- **Database:** Supabase PostgreSQL with `pgvector`, managed via **Drizzle ORM** (`drizzle-orm`, `postgres`, `drizzle-kit`). Schema: `src/db/schema.ts`. Migrations: `drizzle/`.
- **Scraping Engine:** Node.js scripts in `/scripts` using `crawlee`, `cheerio`, `@mozilla/readability`, `jsdom`. Library code in `src/lib/scraper`.
- **AI SDK:** `openai` package with custom `baseURL` for DeepSeek (`https://api.deepseek.com/v1`), xAI Grok (`https://api.x.ai/v1`), Ollama (`OLLAMA_BASE_URL`). Library code in `src/lib/ai`.
- **Admin Editor:** Tiptap (`@tiptap/react`, `@tiptap/starter-kit`).

## 3. Target Data Sources (Phased Approach)
- **Tier 1 (Structured & High-Value):** `opendata.gov.mn` (HTML scraping of dataset listings, no CKAN API), `tender.gov.mn` (procurement invitations & results), `legalinfo.mn` (new resolutions).
- **Tier 2 (Ministries & Agencies):** `zasag.mn`, `mof.gov.mn` (Finance), `mojha.gov.mn` (Justice), `mmhi.gov.mn` (Mining), `med.gov.mn` (Economy), `mfa.gov.mn` (Foreign Affairs), `moh.gov.mn` (Health), `met.gov.mn` (Environment), `iaac.mn` (Anti-Corruption), `audit.mn` (National Audit), plus the remaining ministries seeded in `scripts/seed-sources.ts`.

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
- `npm run scrape` (`--dry-run`, `--source <domain>`, `--limit <n>`)
- `npm run ai:process` (`--dry-run`, `--limit <n>`, `--id <articleId>`)
- `npm run ui:sync-elevenlabs` re-vendors ElevenLabs UI components from the registry

## 6. MCP
`.mcp.json` registers the Supabase MCP server for project `boyhogngfxynhirkjdqb`. Authenticate once locally with `claude /mcp` → supabase → Authenticate.
