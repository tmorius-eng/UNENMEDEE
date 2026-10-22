# Security policy / Аюулгүй байдлын бодлого

## Reporting a vulnerability

Please **do not open a public issue** for a security problem.
Report it privately: **Security → Report a vulnerability** on this repository
(GitHub private vulnerability reporting). You will get an answer within 7 days.

Useful details: the URL or file, steps to reproduce, and what an attacker could do.

## Эмзэг байдал мэдэгдэх

Аюулгүй байдлын асуудлыг **нийтэд нээлттэй issue болгож бүү бичээрэй**.
Энэ repository-ийн **Security → Report a vulnerability** товчоор нууцаар мэдэгдэнэ үү.
7 хоногийн дотор хариу өгнө.

## Scope

- The site https://iltodmedee.mn and the code in this repository (scrapers, AI pipeline,
  admin, push notifications, GitHub Actions workflows).
- Out of scope: the government websites we read from, denial-of-service, social engineering,
  and reports from automated scanners without a working proof.

## How secrets are handled

- No API key, database password or private key is stored in this repository.
  AI provider keys and `DATABASE_URL` live only in GitHub Actions secrets and Vercel
  environment variables; `.env*` files are git-ignored (only `.env.example` is committed).
- Workflows run with read-only `GITHUB_TOKEN` permissions, actions are pinned to commit
  SHAs, and Dependabot proposes updates weekly.
- Paid AI providers stop at a monthly USD cap (`AI_MONTHLY_BUDGET_USD`), so a leaked or
  abused key cannot run up an unbounded bill. Every call is logged on `/transparency`.

## Threat model (what protects what)

- **One database role, two writers.** GitHub Actions (scraper, AI, syncs) and Vercel share the
  owner connection string. Vercel must write: push subscriptions, followed MPs, admin edits and
  the donation setting. A read-only role would break those, so instead every write path on Vercel
  validates its input (zod, a push-service host allowlist) or calls `requireAdmin()`, and public
  ones are rate-limited and capped (`subscribePush`: 10 per IP per hour, 500 new per hour, 50k
  total). Row-level security with no policies blocks Supabase's public REST API on every table.
- **Admin.** `/admin` is guarded twice (`proxy.ts` redirect and `requireAdmin()` in every page and
  server action). The password is 12+ characters and compared in constant time; each wrong guess
  waits 800 ms and an IP is locked out for 15 minutes after 5 failures. Sessions are HMAC-signed,
  expire after 7 days and end for everyone when the password changes.
- **Scraped content.** Pages are stored as cleaned text, never HTML. Links rendered from scraped
  data must be http(s) (`safeHttpUrl`). Text sent to AI models is wrapped in `<article_text>` tags
  and every prompt says to ignore instructions inside it (indirect prompt injection); the output is
  validated with zod, and the "high risk" flag is computed by our code, not taken from the model.
- **Admin URL fetching.** URLs typed into the admin go through an SSRF guard (http(s) on 80/443,
  every redirect re-checked, private and metadata IPs refused).
- **Browser.** `nosniff`, `X-Frame-Options: DENY`, a strict referrer policy, a permissions policy,
  and a CSP with `base-uri`, `object-src 'none'`, `frame-ancestors 'none'` and `form-action`.
  There is no `script-src`: Next.js needs inline scripts, and nonces would make every static page
  dynamic.
- **Supply chain.** Actions pinned to commit SHAs, read-only `GITHUB_TOKEN`, Dependabot with a
  7-day cooldown, dependency review and CodeQL on PRs, and a `main` ruleset (PR + green CI). Forks
  never run the scheduled workflows (`if: github.repository == …`).

## Supported versions

Only the `main` branch (what runs on iltodmedee.mn) receives fixes.
