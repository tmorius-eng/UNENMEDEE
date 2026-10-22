# Хувь нэмэр оруулах / Contributing

Баярлалаа! ИЛ ТОД МЭДЭЭ бол нээлттэй эхийн, хэн ч сайжруулж болох төсөл.
**English below.**

## Эхлэх

```bash
git clone https://github.com/tmorius-eng/UNENMEDEE && cd UNENMEDEE
npm install          # Node.js 24
npm run dev          # http://localhost:3000 (өгөгдлийн сангүйгээр хоосон хуудсууд харагдана)
npm run check        # typecheck + lint + unit test (нууц түлхүүр хэрэггүй)
```

Бодит өгөгдөлтэй ажиллуулахын тулд үнэгүй Supabase төсөл үүсгээд `.env`-д `DATABASE_URL`, нэг үнэгүй
AI түлхүүр (`GROQ_API_KEY`) тавина. Дэлгэрэнгүйг [README](README.md#өөрийн-компьютер-дээр-ажиллуулах)-с үзнэ үү.

## Юу хийж болох вэ

| Хийх зүйл | Хаана |
|---|---|
| **Төрийн шинэ сайт нэмэх** | [`src/lib/sources.ts`](src/lib/sources.ts)-д нэг мөр нэмнэ. Эсвэл [issue нээж](https://github.com/tmorius-eng/UNENMEDEE/issues/new/choose) санал болгоно. |
| **JSON API / RSS-тэй сайт** | [`src/lib/scraper/adapters/`](src/lib/scraper/adapters)-д adapter бичээд `API_ADAPTERS`-д бүртгэнэ (`police.ts`, `legalinfo.ts` жишээ). |
| **Гарчиг, огноо буруу таньж байвал** | Тухайн хуудсыг `tests/fixtures/`-д хадгалаад [`extractor.ts`](src/lib/scraper/extractor.ts) / [`titles.ts`](src/lib/scraper/titles.ts)-ийг засаж, тест нэмнэ. |
| **AI буруу хураангуйлсан** | Эх сурвалжийн холбоостой issue нээнэ. Prompt нь [`src/lib/ai/prompts.ts`](src/lib/ai/prompts.ts)-д бий. |
| **UI, орчуулга, хүртээмж** | `src/components/`, `src/app/`. Бүх текст цэвэр монгол хэлээр. |

## Дүрэм

1. **Зөвхөн баримт.** Хэнийг ч буруутгахгүй; албан эх сурвалжийн холбоостой тоо, баримт л харуулна.
2. **Эелдэг скрапер.** robots.txt-г дагана; нэг сайтад 8 секундээс доошгүй завсар; Cloudflare зэрэг
   хамгаалалтыг тойрох оролдлого хийхгүй; TLS шалгалтыг хэзээ ч унтраахгүй.
3. **Нууц түлхүүр кодонд оруулахгүй.** Түлхүүр зөвхөн `.env` (git-д ордоггүй), GitHub Secrets, Vercel-д.
4. **0₮ дэд бүтэц.** Үнэгүй хязгаарт багтах; HTML биш, цэвэрлэсэн текст л хадгална.
5. **Хурд.** Нүүр хуудсанд хүнд JavaScript нэмэхгүй (Lighthouse mobile ≥ 0.9).

## Pull request

- `main` хамгаалагдсан: өөрчлөлт зөвхөн PR-ээр, CI (`check`) ногоон үед нэгтгэгдэнэ.
- PR илгээхийн өмнө `npm run check` болон `npm run build` (нууц түлхүүргүй) давах ёстой.
- Нэг PR = нэг сэдэв. Юуг, яагаад өөрчилснөө тайлбарлана.
- Архитектурын дэлгэрэнгүй: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), дүрмүүд: [CLAUDE.md](CLAUDE.md).
- **Аюулгүй байдлын асуудлыг** нээлттэй issue биш, [SECURITY.md](SECURITY.md)-ийн дагуу нууцаар мэдэгдэнэ.

Код MIT, сайтын агуулга [CC BY 4.0](LICENSE-CONTENT.md) лицензтэй. PR илгээснээр та өөрийн хувь
нэмрийг эдгээр лицензээр нийтлэхийг зөвшөөрч байна.

---

## English

**Start:** `npm install && npm run dev` (Node.js 24). The site builds and runs without any secrets
and shows empty states. `npm run check` runs typecheck, lint and the unit tests, offline.

**Good first contributions**
- A new government source: one line in [`src/lib/sources.ts`](src/lib/sources.ts), or an issue.
- A site with a JSON API or RSS: an adapter in [`src/lib/scraper/adapters/`](src/lib/scraper/adapters).
- A wrong headline or date: save the page into `tests/fixtures/`, fix
  [`extractor.ts`](src/lib/scraper/extractor.ts) / [`titles.ts`](src/lib/scraper/titles.ts), add a test.
- UI, accessibility and copy (all public text is Mongolian Cyrillic).

**Rules:** facts only (no accusations; official sources linked); respect robots.txt and an 8 s
per-host delay; never bypass Cloudflare or disable TLS checks; no secrets in code; stay within free
tiers; keep the home page light.

**Pull requests:** `main` only accepts PRs with green CI. Run `npm run check` and `npm run build`
first. One topic per PR. Report security problems privately per [SECURITY.md](SECURITY.md).

Code is MIT; site content is [CC BY 4.0](LICENSE-CONTENT.md). By opening a PR you agree to license
your contribution under these terms.
