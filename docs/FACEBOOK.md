# Facebook, Threads, Instagram-д автоматаар нийтлэх

Pipeline (`autonomous-news-pipeline.yml`, 2 цаг тутам), `news-digest.yml` болон гараар ажиллуулах
`social-post.yml` дараах хоёрыг ИЛ ТОД МЭДЭЭ-ийн Facebook хуудас, Threads, Instagram-д нийтэлнэ
(`npm run social:post`, `scripts/post-social.ts`):

- **Тойм** (`--mode digest`): өглөө/оройн шинэ тойм бүр, эхний 5 гарчиг + `/digest` холбоос.
- **Чухал мэдээ** (`--mode news`): сүүлийн 24 цагт нийтлэгдсэн, огноотой, AI товчилсон, ач холбогдол
  ≥ 75 (`FB_IMPORTANCE_MIN`) эсвэл эрсдэлийн тэмдэгтэй мэдээ. Нэг удаад 1 (`FB_NEWS_PER_RUN`),
  24 цагт ихдээ 4 (`FB_NEWS_PER_DAY`), нэг сэдвийн (cluster) мэдээг нэг л удаа.

Пост бүр манай 1080×1350 "hook" карттай (`/ig-image`, `hookCard` in `src/lib/og.tsx`): Facebook-т
зурагтай пост (`/{page}/photos`, холбоос текстэнд; зураггүй үед л `/feed` холбоосны пост), Threads-д
IMAGE пост, Instagram-д зураг + тайлбар. Текст нь hook-оор эхэлнэ (⚡ гарчиг, 👉 яагаад чухал), дараа нь
₮ дүн, эх сурвалж, холбоос, hashtag. Нийтэлсэн бүхэн `social_posts` хүснэгтэд урьдчилан бичигдэх тул нэг
мэдээ хоёр дахин гарахгүй: платформ тодорхой татгалзсан үед л мөр устаж дараагийн run дахин оролдоно;
хариу ирээгүй (timeout) эсвэл нийтлэгдсэний дараа DB алдаа гарвал мөр үлдэж (`post_id = 'unknown'`),
лог-д `::warning::` гарна: хуудсаа гараар шалгана. Токен тохируулаагүй платформ алгасагдана; secret-ийг
устгавал тэр платформ зогсоно (хадгалсан токеныг цааш ашиглахгүй).

## Нэг удаагийн тохиргоо (≈10 минут)

Токеныг хэзээ ч чатад, issue-д, код руу бүү хуулаарай: зөвхөн GitHub Secret-д хадгална.

1. https://developers.facebook.com/apps → **Create app**. Use case: **Manage everything on your
   Page** (Pages API). Апп-ын нэр жишээ нь "ИЛ ТОД МЭДЭЭ poster".
2. **Tools → Graph API Explorer**: баруун талд өөрийн аппыг сонгоод **User or Page → Get User
   Access Token**, эрхүүд: `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`.
   **Generate Access Token** дарж, ИЛ ТОД МЭДЭЭ хуудсаа сонгож зөвшөөрнө.
3. **Tools → Access Token Debugger**: тэр токеныг буулгаад **Extend Access Token** (60 хоногийн
   хэрэглэгчийн токен болно).
4. Graph API Explorer-т урт хугацааны токеноо тавиад `GET me/accounts?fields=id,name,access_token`
   ажиллуулна. Хуудасныхаа мөрнөөс:
   - `access_token` → **FB_PAGE_TOKEN**. Debugger-т шалгахад **Expires: Never** гэж гарна.
     3-р алхмын хэрэглэгчийн токеныг хадгалсан бол скрипт `/me/accounts`-оос хуудасны токеныг авч
     нийтэлнэ, гэхдээ лог-д `::warning::` гарна: тэр токен ~60 хоногт дуусна, хуудасны токеноор солино.
   - `id` → **FB_PAGE_ID** (заавал биш: хоосон бол скрипт хуудасны токеноор `GET /me`-ээс олно).
5. GitHub → репо → **Settings → Secrets and variables → Actions**:
   - **Secrets** таб → `FB_PAGE_TOKEN` (хуудасны токен);
   - **Variables** таб → `FB_PAGE_ID` (хүсвэл).
6. Шалгах: **Actions → Social post (manual) → Run workflow** (`dry_run=true` эхлээд). `✓ posted <id>`
   эсвэл "no new important story" гарна.

Хэрэв постыг зөвхөн та харж байвал аппыг **Live** горимд шилжүүлнэ (App settings → Basic:
нууцлалын бодлогын холбоос шаардана).

## Токен хүчингүй болох үед

Facebook нууц үгээ солих, хуудасны админаас гарах, аппыг устгахад токен хүчингүй болно. Лог-д
`Facebook 400: … code 190` / "FB_PAGE_TOKEN expired or revoked" гарна: 2–5-р алхмыг давтаад
secret-ээ шинэчилнэ. `code 200` = `pages_manage_posts` эрх дутуу; `code 368` = Facebook түр
хязгаарласан (бага нийтлэх).

## Messenger бот

Хуудасны Messenger-т ирсэн мессежид AI-гүй бот хариулна (`src/app/api/messenger/route.ts`): "тойм" →
сүүлийн тойм, мэндчилгээ → тусламж, бусад → сайтын хайлтын эхний 3 мэдээ, холбоостой. Мессеж хадгалахгүй.

1. Апп → **Use cases → Engage with customers on Messenger**: хуудсаа холбож `pages_messaging` эрхтэй
   хуудасны токен авна.
2. Vercel → **Environment Variables** → `MESSENGER_SETTINGS` = JSON
   `{"pageId","pageToken","appSecret","verifyToken","igAppSecret"}` (эсвэл `app_settings` түлхүүр `messenger`).
3. Webhook: Callback URL `https://iltodmedee.mn/api/messenger`, Verify token = `verifyToken`, field `messages`.
   POST бүрийг `X-Hub-Signature-256`-аар шалгана; бот эхлээд 200 хариулаад дараа нь илгээнэ (`after()`),
   Meta дахин илгээсэн мессежид (ижил `mid`) нэг л удаа хариулна.

## Гараар

```bash
npm run social:post -- --mode news --dry-run     # юу нийтлэхийг хэвлэнэ, юу ч илгээхгүй
npm run social:post -- --mode digest
```

## Threads

Тойм болон чухал мэдээ Threads-д IMAGE пост болж нийтлэгдэнэ (hook карт, 500 тэмдэгт, emoji-г UTF-8 байтаар
тоолно, холбоос текстэнд).

1. Апп → **App roles → Roles** → Threads Tester болгож Iltodmedee-ийн Threads акаунтыг нэмэх, Threads дээр
   **Settings → Account → Website permissions → Invites**-ээс зөвшөөрөх.
2. **Use cases → Access the Threads API → Customize**: `threads_basic`, `threads_content_publish` → Add;
   **User Token Generator**-оос токен үүсгэх.
3. Токеныг урт хугацааных (60 хоног) болгоод (`graph.threads.com/access_token?grant_type=th_exchange_token`,
   Threads app secret хэрэгтэй) GitHub **Secrets**-д `THREADS_TOKEN` нэрээр хадгална.

Pipeline токеныг 7 хоног тутам өөрөө шинэчилж `app_settings`-д хадгална, тиймээс дахин юу ч хийх шаардлагагүй.
Токен хүчингүй болбол (нууц үг солих г.м.) шинэ токеныг `THREADS_TOKEN`-д хадгалахад хангалттай.

## Instagram

Тойм, чухал мэдээ Instagram-д 1080×1350 JPEG карт + тайлбартай нийтлэгдэнэ (`/ig-image`). Instagram DM-д
Messenger-тэй адил бот (AI-гүй, сайтын мэдээ, холбоосоор) хариулна.

1. Instagram акаунтыг **Professional → Business** болгох.
2. **Use cases → Manage messaging & content on Instagram → API setup with Instagram login**:
   **Add account** → iltodmedee.mn → **Generate token**.
3. Токеныг GitHub **Secrets**-д `INSTAGRAM_TOKEN` нэрээр хадгална. Pipeline 7 хоног тутам өөрөө шинэчилж
   `app_settings`-д хадгална; DM бот тэндээс уншина.
4. DM бот: Instagram апп → **Settings → Messages and story replies → Message controls → Connected tools →
   Allow access to messages**; webhook (`/api/messenger`, object `instagram`, field `messages`); Instagram app
   secret-ийг `MESSENGER_SETTINGS`-д `igAppSecret` болгож нэмнэ.
