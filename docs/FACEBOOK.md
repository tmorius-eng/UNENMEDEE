# Facebook хуудсанд автоматаар нийтлэх

Pipeline (`autonomous-news-pipeline.yml`, 2 цаг тутам) болон `news-digest.yml` дараах хоёрыг
ИЛ ТОД МЭДЭЭ-ийн Facebook хуудсанд нийтэлнэ (`npm run social:post`, `scripts/post-social.ts`):

- **Тойм** (`--mode digest`): өглөө/оройн шинэ тойм бүр, эхний 5 гарчиг + `/digest` холбоос.
- **Чухал мэдээ** (`--mode news`): сүүлийн 24 цагт нийтлэгдсэн, огноотой, AI товчилсон, ач холбогдол
  ≥ 75 (`FB_IMPORTANCE_MIN`) эсвэл эрсдэлийн тэмдэгтэй мэдээ. Нэг удаад 1 (`FB_NEWS_PER_RUN`),
  24 цагт ихдээ 4 (`FB_NEWS_PER_DAY`), нэг сэдвийн (cluster) мэдээг нэг л удаа.

Пост бүр AI-ийн товчлол, хамгийн том ₮ дүн, албан эх сурвалжийн нэр, сайтын холбоостой. Facebook
холбоосны картыг манай OG зургаас өөрөө үүсгэнэ. Нийтэлсэн бүхэн `social_posts` хүснэгтэд
бичигдэх тул нэг мэдээ хоёр дахин гарахгүй. Токен тохируулаагүй бол алхмууд алгасагдана.

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
   - `id` → **FB_PAGE_ID** (хуудасны дугаар, `profile.php?id=…` дахь тоо байх магадлалтай);
   - `access_token` → **FB_PAGE_TOKEN**. Debugger-т шалгахад **Expires: Never** гэж гарна.
5. GitHub → репо → **Settings → Secrets and variables → Actions**:
   - **Secrets** таб → `FB_PAGE_TOKEN` (хуудасны токен);
   - **Variables** таб → `FB_PAGE_ID`.
6. Шалгах: **Actions → Autonomous news pipeline → Run workflow**. "Post … to the Facebook page"
   алхамд `✓ posted <id>` эсвэл "No new important story" гарна.

Хэрэв постыг зөвхөн та харж байвал аппыг **Live** горимд шилжүүлнэ (App settings → Basic:
нууцлалын бодлогын холбоос шаардана).

## Токен хүчингүй болох үед

Facebook нууц үгээ солих, хуудасны админаас гарах, аппыг устгахад токен хүчингүй болно. Лог-д
`Facebook 400: … code 190` / "FB_PAGE_TOKEN expired or revoked" гарна: 2–5-р алхмыг давтаад
secret-ээ шинэчилнэ. `code 200` = `pages_manage_posts` эрх дутуу; `code 368` = Facebook түр
хязгаарласан (бага нийтлэх).

## Гараар

```bash
npm run social:post -- --mode news --dry-run     # юу нийтлэхийг хэвлэнэ, юу ч илгээхгүй
npm run social:post -- --mode digest
```
