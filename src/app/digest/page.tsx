import type { Metadata } from "next";
import { Suspense } from "react";

import { DigestView } from "@/components/iltod/digest-view";
import { Empty } from "@/components/iltod/empty";
import { PageHeader } from "@/components/iltod/page-header";
import { ShareButton } from "@/components/iltod/share-button";
import { FeedSkeleton } from "@/components/iltod/skeletons";

import { Ledger } from "@/components/iltod/macro-strip";
import { formatNumber } from "@/lib/format";
import { getDigests, getWeekNumbers } from "@/lib/queries";
import { digestWindowsLabel } from "@/lib/edition";

export const metadata: Metadata = {
  title: "Өнөөдрийн онцлох мэдээ — өглөө, оройн тойм",
  alternates: { canonical: "/digest" },
  description: "Төрийн байгууллагуудын мэдээнээс улс орны хэмжээнд хамгийн чухал мэдээг AI редактор 12 цаг тутам сонгож, баримтад суурилж тоймлоно.",
};

/** "📊 Энэ 7 хоногт": plain counts, each linking to where the reader can see them. */
async function WeekNumbers() {
  const w = await getWeekNumbers();
  if (!w) return null;
  const cells = [
    { label: "Мэдээ", value: formatNumber(w.articles), note: "энэ 7 хоногт", href: "/" },
    { label: "Эх сурвалж", value: formatNumber(w.sources), note: "мэдээлсэн", href: "/sources" },
    { label: "Хууль, тогтоол", value: formatNumber(w.legalActs), note: "legalinfo.mn", href: "/laws" },
    { label: "₮ дүн дурдсан", value: formatNumber(w.withAmounts), note: "мэдээ", href: "/topic/budget" },
    { label: "Өндөр эрсдэл", value: formatNumber(w.risky), note: "AI-ийн үнэлгээ", href: "/topic/risk", tone: w.risky > 0 ? ("down" as const) : undefined },
  ];
  return (
    <section aria-labelledby="week" className="flex flex-col gap-3 pb-10">
      <h2 id="week" className="label-mono text-tertiary">
        📊 Энэ 7 хоногт
      </h2>
      <Ledger cells={cells} wide={5} />
    </section>
  );
}

async function Digests() {
  const [editions, reviews] = await Promise.all([getDigests("12h", 14, true), getDigests("30d", 1, true)]);
  if (editions.length === 0 && reviews.length === 0) {
    return <Empty title="Тойм хараахан бэлэн болоогүй" description={`AI редактор ${digestWindowsLabel()} (Улаанбаатарын цагаар) шинэ тойм бэлтгэнэ.`} />;
  }
  return (
    <div className="flex flex-col gap-12">
      {editions.length > 0 && (
        <section aria-labelledby="editions" className="flex flex-col gap-6">
          <h2 id="editions" className="label-mono text-tertiary">
            🕗 12 цагийн тойм
          </h2>
          {editions.map((d, i) => (
            <DigestView key={d.id} digest={d} track={i === 0} />
          ))}
        </section>
      )}
      {reviews.length > 0 && (
        <section aria-labelledby="month" className="flex flex-col gap-6">
          <h2 id="month" className="label-mono text-tertiary">
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
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader
        eyebrow="AI редакторын тойм · өдөрт 2 удаа"
        title="Онцлох тойм"
        description={`Өдөрт хоёр удаа, ${digestWindowsLabel()} AI редактор сүүлийн 12 цагийн бүх төрийн мэдээнээс иргэдийн амьдрал, төсөв, хууль, эрүүл мэнд, авлигад хамгийн их нөлөөлөх мэдээг сонгож, пи-аргүйгээр тоймлоно.`}
      >
        <ShareButton path="/digest" title="Өнөөдрийн онцлох мэдээ · ИЛ ТОД МЭДЭЭ" className="w-fit" />
      </PageHeader>
      <Suspense fallback={null}>
        <WeekNumbers />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <Digests />
      </Suspense>
    </div>
  );
}
