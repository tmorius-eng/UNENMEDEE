# ИЛ ТОД (IL-TOD) — Пи-аргүй төрийн мэдээ

> 🇲🇳 Монгол Улсын төрийн байгууллагуудын албан ёсны мэдээ, тендер, төсвийг автоматаар цуглуулж, **баримтыг улс төрийн пи-араас салгадаг**, бүх зардлаа олон нийтэд ил тайлагнадаг нээлттэй эхийн платформ.
>
> 🇬🇧 An open-source platform that automatically collects official news, tenders and budgets from Mongolian government websites, **separates verifiable facts from political PR spin**, and publishes every cent it spends.

**Монгол** · [English](#english)

---

## Юу хийдэг вэ?

1. **Цуглуулна.** 95+ төрийн вэбсайт (яам, агентлаг, 21 аймаг, шүүх, УИХ, Шилэн данс, Нээлттэй өгөгдөл…) 2 цаг тутам robots.txt-г хүндэтгэн, нэг домэйнд 8 секундээс доошгүй завсартай уншина. Шинэ `*.gov.mn`, `*.khural.mn` сайтыг долоо хоног бүр автоматаар илрүүлж нэмнэ.
2. **Шүүнэ.** Мэдээ бүрийг үнэгүй AI (Groq, Gemini, Requesty, NVIDIA; дуусвал DeepSeek) уншиж 3 өгүүлбэрийн хураангуй, шалгагдах баримт, пи-арын шинж, мөнгөн дүн, эрсдэлийн оноо (0-100) гаргана.
3. **Гүнзгий шинжилнэ.** Эрсдэлийн оноо 65+ (тендергүй шууд гэрээ, тодорхойгүй зарцуулалт…) бол xAI Grok (өдөрт 5 удаа) эсвэл үнэгүй Gemini Flash эрэн сурвалжлах дүгнэлт, иргэдийн асуух ёстой асуултуудыг бичнэ.
4. **Нотолно.** Нийтлэл бүр эх `.gov.mn` холбоос болон цэвэрлэсэн эх текстийн **SHA-256 хэштэй**. Хэн ч дахин татаж шалгаж болно.
5. **Тоймлоно.** Өглөө 08:00, орой 20:00 цагт AI редактор сүүлийн 12 цагийн бүх мэдээнээс улс орны хэмжээнд хамгийн чухал 10-ыг сонгож "Онцлох тойм" бичнэ (`/digest`). Сүүлийн 30 хоногийн тоймыг гараар ажиллуулж болно.
6. **Тоогоор нотолно.** opendata.mn-ийн бүх өгөгдлийн багцыг өдөрт 2 удаа API-аар татаж Монголбанкны ханш, инфляци, цалин, тендер, тендерийн хар жагсаалт, УИХ-ын ирцийг `/data` хуудсанд харуулна.
7. **Апп ба мэдэгдэл.** Сайтыг утсандаа апп болгон суулгаж (PWA), чухал шинэ мэдээ болон өдөр бүрийн тойм гарахад push мэдэгдэл авна. iPhone дээр эхлээд "Add to Home Screen" хийнэ.
8. **Тайлагнана.** AI дуудлага бүрийн токен, үнэ `ai_usage_logs`-д бичигдэж `/transparency` хуудсанд шууд харагдана.

| Давхарга | Технологи | Сарын зардал |
|---|---|---|
| Вэб | Next.js 16 (App Router, Cache Components) + Vercel Hobby | 0₮ |
| Дизайн | Untitled UI React + ElevenLabs UI (Message, Response, Orb), Tailwind 4, motion | 0₮ |
| Өгөгдлийн сан | Supabase PostgreSQL + pgvector, Drizzle ORM | 0₮ (500MB) |
| Скрапер | GitHub Actions cron + Crawlee (HTTP + Playwright Chromium) | 0₮ (нээлттэй репо) |
| AI 1-р шат | Groq → Gemini → Requesty (Gemma) → NVIDIA NIM, үнэгүй хувилбарууд | 0₮ |
| AI 2-р шат | xAI Grok (өдөрт ≤5) → Gemini Flash (үнэгүй) | ≤$3 (хязгаартай) |
| AI нөөц | DeepSeek (төлбөртэй, хязгаартай), Ollama (локал) | ≤$3 нийт |

**Мөнгө шатаахгүй.** Төлбөртэй AI (DeepSeek, Grok, Requesty-ийн төлбөртэй загвар) сард `AI_MONTHLY_BUDGET_USD` (анхдагч $3), өдөрт `AI_DAILY_BUDGET_USD` ($0.30)-аас хэтэрвэл автоматаар зогсоно. Grok өдөрт 5 удаа. Үнэгүй AI-ууд үргэлжлүүлэн ажиллана. Нээлттэй өгөгдлийн багцуудыг AI-гүйгээр (0 токен) дүрмээр хураангуйлна.

## Суулгах (5 алхам)

```bash
git clone https://github.com/tmorius-eng/UNENMEDEE && cd UNENMEDEE
npm install
cp .env.example .env          # DATABASE_URL, GROQ_API_KEY (эсвэл өөр үнэгүй түлхүүр), ADMIN_SECRET_PASSWORD
npm run db:migrate && npm run db:seed
npm run dev                   # http://localhost:3000
```

Туршиж үзэх (өгөгдлийн сангүйгээр):

```bash
npm run scrape -- --dry-run --source mlsp.gov.mn,parliament.mn --limit 2
npm run ai:process -- --sample     # API түлхүүр зөв эсэхийг шалгана
```

**`DATABASE_URL` хаанаас авах вэ?** Supabase төслийн хуудасны дээд талын **Connect** товч → **Transaction pooler** (порт 6543). Шууд холбоос: `https://supabase.com/dashboard/project/<ref>?showConnect=true&method=transaction`. `[YOUR-PASSWORD]`-ийг өөрийн өгөгдлийн сангийн нууц үгээр солино (мартсан бол Database Settings → Reset database password). GitHub Actions-ийн migration-д зориулж **Session pooler** (порт 5432) хаягийг `DATABASE_URL_DIRECT` нэрээр нэмж болно.

**Автоматжуулалт:** GitHub репо → Settings → Secrets → Actions хэсэгт `DATABASE_URL` болон дор хаяж нэг AI түлхүүр (`GROQ_API_KEY`, `GEMINI_API_KEY`, `REQUESTY_API_KEY`, `NVIDIA_API_KEY`; хүсвэл `DEEPSEEK_API_KEY`, `GROK_API_KEY`) нэмэхэд `.github/workflows/autonomous-news-pipeline.yml` 2 цаг тутам ажиллана. Vercel дээр мөн адил env-үүдийг (мөн `ADMIN_SECRET_PASSWORD`, 12+ тэмдэгт) тохируулна.

**Админ:** `/admin` → мэдээ засах/нуух, Grok-оор дахин шинжлэх, сарын зар/хандивын орлого бүртгэх, `/admin/filter` дээр дурын URL эсвэл текстийг "тархи угаалтын шүүлтүүр"-ээр шалгаж нэг товчоор нийтлэх.

---

<a id="english"></a>

## English

### How it works

```
GitHub Actions (every 2h, free on public repos)
 ├─ npm run scrape          95+ seeded sources, least-recently-scraped first, 30-min budget
 │   ├─ JSON APIs           opendata.gov.mn, parliament.mn (the same endpoints their own sites call)
 │   ├─ HTTP pass (Crawlee) WordPress REST API → RSS → scored link harvesting → Readability
 │   └─ Browser pass        headless Chromium only for JavaScript-rendered sites (gov.mn, …)
 │      → SHA-256 dedup → clean text only (≤15 KB) → articles (tldr = null)
 └─ npm run ai:process
     ├─ Budget guard                            paid providers stop at $3/month, $0.30/day; Grok ≤ 5 calls/day
     ├─ Tier 1  Groq → Gemini → Requesty → NVIDIA → DeepSeek → (Ollama)   free first; facts, spin, risk 0-100
     ├─ Tier 2  Grok → Gemini Flash → Groq → … only when risk ≥ 65: investigative analysis
     ├─ Clustering                              cross-source Jaccard (Mongolian stems + entities), 7-day window
     └─ ai_usage_logs + transparency_ledger    exact tokens and USD for every call
GitHub Actions (08:07 and 20:07 Ulaanbaatar)
 ├─ npm run data:sync       opendata.mn catalogue (36+ datasets) → small highlights for /data
 ├─ npm run macro:sync      Mongolbank policy rate, inflation, FX, gold, reserves → home strip + /data
 ├─ npm run budget:sync     budget since 1990, spending, revenue, debt, Шилэн данс, audit opinions → /budget
 └─ npm run digest          rank the last 12 h without AI → editor model picks 10 stories → /digest
Vercel (Next.js 16, Cache Components) reads Supabase and renders the public site + /admin.
```

### Repository map

| Path | What |
|---|---|
| `CLAUDE.md` | Architecture rules for contributors and AI agents |
| `src/db/schema.ts`, `drizzle/` | Drizzle schema and SQL migrations (RLS on, pgvector enabled) |
| `src/lib/sources.ts` | Curated source list, discovery hubs |
| `src/lib/scraper/` | robots.txt parser, polite fetch, extractor, adapters, two-pass crawler, discovery |
| `src/lib/ai/` | Router (fallback chains, cost logging), budget guard, prompts, schemas, clustering, digest, pricing |
| `src/lib/opendata-mn/` | opendata.mn API client and dataset highlights (FX, macro, wages, tenders, blacklist, parliament attendance) |
| `src/lib/queries.ts` | Cached read model for the public site |
| `src/app/` | Pages: `/`, `/article/[slug]`, `/digest`, `/data`, `/risk`, `/clusters`, `/sources`, `/transparency`, `/admin` |
| `src/components/ui/` | ElevenLabs UI (via shadcn), adapted to Untitled UI tokens |
| `src/components/base`, `application` | Untitled UI React components (via `untitledui` CLI) |
| `.github/workflows/` | Pipeline (2h, manual 30-day backfill), news digest + data sync (12h), source discovery (weekly), CI |

### Audit it yourself

- **Every number on `/transparency` comes from SQL.** `ai_usage_logs` stores provider, model, prompt and completion tokens, and the USD cost computed from the public price table in `src/lib/ai/pricing.ts`.
- **Every article links to its `.gov.mn` original** and shows the SHA-256 of the cleaned text. If an editor changes the text, the page says so openly; the hash keeps proving the original scrape.
- **Pipeline logs are public** in the repository's Actions tab.
- **Risk scores are signals, not accusations.** Prompts forbid asserting crimes; Grok is asked for questions citizens should ask.

### Honest limits

- **Free GitHub Actions minutes require a public repository.** A private repo gets about 2,000 free minutes a month, and a 2-hourly pipeline needs far more.
- **GitHub disables scheduled workflows** in public repos after 60 days without commits. Re-enable them in the Actions tab.
- **Some sites block cloud IPs or use a Cloudflare browser challenge**, notably tender.gov.mn and president.mn. They fail gracefully and back off. Running the scraper from a machine in Mongolia covers them.
- **AI prices and model ids change.** Paid defaults follow the original spec; verify them at the DeepSeek and xAI pricing pages and override them with repository variables. Free tiers (Groq, Gemini, NVIDIA, Requesty's free models) are rate limited and may use prompts for training; we only send already-public government news.

### Contributing

```bash
npm run check   # typecheck + lint + 110+ unit tests (no secrets needed)
npm run build   # must pass without DATABASE_URL
```

Add a source: append it to `src/lib/sources.ts`, or let `npm run sources:discover` find it. Sites with a JSON API get an adapter in `src/lib/scraper/adapters/`. For the Supabase MCP server in Claude Code, create a local (git-ignored) `.mcp.json` with `claude mcp add --scope project --transport http supabase "https://mcp.supabase.com/mcp?project_ref=<your-project-ref>"`.

License: MIT.
