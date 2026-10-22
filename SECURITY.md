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

## Supported versions

Only the `main` branch (what runs on iltodmedee.mn) receives fixes.
