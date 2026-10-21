import Link from "next/link";
import { Suspense } from "react";

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
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <p className="font-semibold text-primary">Шалгах боломжтой</p>
          <Link className="text-tertiary hover:text-secondary" href="/transparency">
            Зардлын тайлан (AI токен бүрээр)
          </Link>
          <Link className="text-tertiary hover:text-secondary" href="/sources">
            Хянаж буй бүх эх сурвалж
          </Link>
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
            Эрсдэлийн оноо нь буруутгал биш, анхаарах дохио юм.
          </p>
        </div>
      </div>
    </footer>
  );
}
