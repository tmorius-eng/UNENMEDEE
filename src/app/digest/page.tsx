import type { Metadata } from "next";
import { Suspense } from "react";

import { DigestView } from "@/components/iltod/digest-view";
import { Empty } from "@/components/iltod/empty";
import { PageHeader } from "@/components/iltod/page-header";
import { ShareButton } from "@/components/iltod/share-button";
import { FeedSkeleton } from "@/components/iltod/skeletons";
import Link from "next/link";

import { formatNumber } from "@/lib/format";
import { getDigests, getWeekNumbers } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Өнөөдрийн онцлох мэдээ — өглөө, оройн тойм",
  alternates: { canonical: "/digest" },
  description: "Төрийн байгууллагуудын мэдээнээс улс орны хэмжээнд хамгийн чухал мэдээг AI редактор 12 цаг тутам сонгож, баримтад суурилж тоймлоно.",
};

/** "📊 Энэ 7 хоногт": plain counts, each linking to where the reader can see them. */
async function WeekNumbers() {
  const w = await getWeekNumbers();
  if (!w) return null;
  const tiles = [
    { n: w.articles, label: "төрийн мэдээ", href: "/" },
    { n: w.sources, label: "эх сурвалжаас", href: "/sources" },
    { n: w.legalActs, label: "шинэ хууль, тогтоол", href: "/laws" },
    { n: w.withAmounts, label: "мэдээнд ₮ дүн дурдсан", href: "/topic/budget" },
    { n: w.risky, label: "өндөр эрсдэлтэй", href: "/topic/risk" },
  ];
  return (
    <section aria-labelledby="week" className="flex flex-col gap-3 pb-10">
      <h2 id="week" className="text-lg font-semibold text-primary">
        📊 Энэ 7 хоногт
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link href={t.href} prefetch={false} className="flex h-full flex-col gap-1 rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset hover:bg-primary_hover">
              <span className="text-display-xs font-semibold text-primary tabular-nums">{formatNumber(t.n)}</span>
              <span className="text-xs text-tertiary">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

async function Digests() {
  const [editions, reviews] = await Promise.all([getDigests("12h", 14), getDigests("30d", 1)]);
  if (editions.length === 0 && reviews.length === 0) {
    return <Empty title="Тойм хараахан бэлэн болоогүй" description="AI редактор өглөө 08:00, орой 20:00 цагт (Улаанбаатар) шинэ тойм бэлтгэнэ." />;
  }
  return (
    <div className="flex flex-col gap-12">
      {editions.length > 0 && (
        <section aria-labelledby="editions" className="flex flex-col gap-6">
          <h2 id="editions" className="text-lg font-semibold text-primary">
            🕗 12 цагийн тойм
          </h2>
          {editions.map((d, i) => (
            <DigestView key={d.id} digest={d} track={i === 0} />
          ))}
        </section>
      )}
      {reviews.length > 0 && (
        <section aria-labelledby="month" className="flex flex-col gap-6">
          <h2 id="month" className="text-lg font-semibold text-primary">
            🗓 Сүүлийн 30 хоногийн онцлох мэдээ
          </h2>
          {reviews.map((d) => (
            <DigestView key={d.id} digest={d} />
          ))}
        </section>
      )}
    </div>
  );
}

export default function DigestPage() {
  return (
    <>
      <PageHeader
        eyebrow="📰 AI редакторын тойм"
        title="Онцлох тойм"
        description="Өглөө 08:00, орой 20:00 цагт AI редактор сүүлийн 12 цагийн бүх төрийн мэдээнээс иргэдийн амьдрал, төсөв, хууль, эрүүл мэнд, авлигад хамгийн их нөлөөлөх мэдээг сонгож, пи-аргүйгээр тоймлоно."
      >
        <ShareButton path="/digest" title="Өнөөдрийн онцлох мэдээ · ИЛ ТОД МЭДЭЭ" className="w-fit" />
      </PageHeader>
      <Suspense fallback={null}>
        <WeekNumbers />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <Digests />
      </Suspense>
    </>
  );
}
