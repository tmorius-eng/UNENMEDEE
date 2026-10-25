import Link from "next/link";
import { Suspense } from "react";

import { CONTACT_EMAIL, REPO_URL, repoFile } from "@/lib/site";

import { DonateCard } from "./donate";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-secondary bg-secondary_alt pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-3 md:px-8">
        <div className="flex flex-col gap-3">
          <Logo withDomain />
          <p className="text-sm text-tertiary">
            Төрийн албан ёсны мэдээг баримт, пи-ар гэж ялгаж, эрсдэлтэй тендер, төсвийг AI-аар шүүдэг нээлттэй эхийн платформ.
          </p>
          <span className="w-fit rounded-full bg-success-secondary px-3 py-1 text-xs font-semibold text-utility-green-700">🟢 0₮ дэд бүтэц</span>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <p className="font-semibold text-primary">Холбоо барих</p>
            <p className="text-tertiary">Санал хүсэлт, алдаа, хамтын ажиллагаа, хэвлэл мэдээллийн асуудлаар бичээрэй:</p>
            <a className="w-fit font-semibold text-brand-secondary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-semibold text-primary">Шалгах боломжтой</p>
          <Link className="text-tertiary hover:text-secondary" href="/transparency">
            Зардлын тайлан (AI токен бүрээр)
          </Link>
          <Link className="text-tertiary hover:text-secondary" href="/changes">
            Төрийн сайтын засвар, устгалт
          </Link>
          <Link className="text-tertiary hover:text-secondary" href="/clusters">
            Олон эх сурвалжид гарсан сэдвүүд
          </Link>
          <Link className="text-tertiary hover:text-secondary" href="/sources">
            Хянаж буй бүх эх сурвалж
          </Link>
          <Link className="text-tertiary hover:text-secondary" href="/method">
            Арга зүй: AI яаж ажилладаг вэ
          </Link>
          <Link className="text-tertiary hover:text-secondary" href="/privacy">
            Нууцлалын бодлого
          </Link>
          <a className="text-tertiary hover:text-secondary" href={REPO_URL} target="_blank" rel="noreferrer">
            Эх код (GitHub, нээлттэй) ↗
          </a>
          <Link className="mt-3 font-semibold text-brand-secondary hover:underline" href="/support">
            💙 Ил тод мэдээг дэмжих
          </Link>
          <Suspense fallback={null}>
            <DonateCard />
          </Suspense>
        </div>
        <div className="flex flex-col gap-2 text-sm text-tertiary">
          <p className="font-semibold text-primary">Анхааруулга</p>
          <p>
            AI шинжилгээ нь алдаа гаргаж болно. Нийтлэл бүр эх .gov.mn холбоос болон SHA-256 хэштэй тул анхны тексттэй шууд тулгаж шалгана уу.
            Эрсдэлийн оноо нь AI-ийн үнэлгээ, буруутгал биш, анхаарах дохио юм.
          </p>
          <p className="text-xs text-quaternary">
            Агуулга:{" "}
            <a className="hover:text-tertiary hover:underline" href={repoFile("LICENSE-CONTENT.md")} target="_blank" rel="noreferrer license">
              CC BY 4.0
            </a>{" "}
            (эх сурвалжаа iltodmedee.mn гэж дурдана уу) · Код: MIT
          </p>
        </div>
      </div>
    </footer>
  );
}
