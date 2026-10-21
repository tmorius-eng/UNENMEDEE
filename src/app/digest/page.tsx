import type { Metadata } from "next";
import { Suspense } from "react";

import { DigestView } from "@/components/iltod/digest-view";
import { Empty } from "@/components/iltod/empty";
import { PageHeader } from "@/components/iltod/page-header";
import { FeedSkeleton } from "@/components/iltod/skeletons";
import { getDigests } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Өнөөдрийн онцлох мэдээ — өглөө, оройн тойм",
  alternates: { canonical: "/digest" },
  description: "Төрийн байгууллагуудын мэдээнээс улс орны хэмжээнд хамгийн чухал мэдээг AI редактор 12 цаг тутам сонгож, баримтад суурилж тоймлоно.",
};

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
          {editions.map((d) => (
            <DigestView key={d.id} digest={d} />
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
      />
      <Suspense fallback={<FeedSkeleton />}>
        <Digests />
      </Suspense>
    </>
  );
}
