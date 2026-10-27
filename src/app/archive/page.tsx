import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Empty } from "@/components/iltod/empty";
import { PageHeader } from "@/components/iltod/page-header";
import { FeedSkeleton } from "@/components/iltod/skeletons";
import { archiveDateLabel } from "@/lib/archive";
import { getArchiveDays } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Мэдээний архив — өдөр бүрийн төрийн мэдээ",
  alternates: { canonical: "/archive" },
  description: "Сүүлийн 60 хоногийн мэдээ өдрөөр нь: яам, агентлаг, аймаг, УИХ-ын албан сайтад гарсан бүх мэдээ, эх сурвалжийн холбоостой.",
};

async function Days() {
  const days = await getArchiveDays(60);
  if (days.length === 0) return <Empty title="Архив хоосон байна" description="Мэдээ цуглармагц энд өдрөөр нь гарна." />;
  return (
    <ol className="flex flex-col divide-y divide-line-soft border-y border-line">
      {days.map((d) => (
        <li key={d.date}>
          <Link href={`/archive/${d.date}`} prefetch={false} className="flex items-baseline justify-between gap-4 py-3 text-md font-semibold text-primary hover:text-brand-secondary">
            <span>{archiveDateLabel(d.date)} мэдээ</span>
            <span className="num-mono shrink-0 text-sm font-normal text-tertiary">{d.stories}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function ArchivePage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col">
      <PageHeader eyebrow="Архив" title="Мэдээний архив" description="Өдөр бүр төрийн албан сайтад гарсан мэдээ. Нүүр хуудаснаас гарсан мэдээг эндээс олно." />
      <Suspense fallback={<FeedSkeleton />}>
        <Days />
      </Suspense>
    </div>
  );
}
