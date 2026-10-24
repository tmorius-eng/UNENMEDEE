import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Empty } from "@/components/iltod/empty";
import { PageHeader } from "@/components/iltod/page-header";
import { ShareButton } from "@/components/iltod/share-button";
import { FeedSkeleton } from "@/components/iltod/skeletons";
import { formatDateMn } from "@/lib/format";
import { getSourceChanges } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Эх хуудасны өөрчлөлт: төрийн сайт юуг засаж, юуг устгав",
  alternates: { canonical: "/changes" },
  description: "Төрийн сайтууд нийтэлсэн мэдээгээ дараа нь өөрчилсөн эсвэл устгасан тохиолдлууд. Бид анхны текстийг SHA-256 хэштэй хадгалдаг тул юу өөрчлөгдснийг харьцуулж харуулна.",
};

async function Changes() {
  const items = await getSourceChanges();
  if (items.length === 0) {
    return <Empty title="Өөрчлөлт илрээгүй байна" description="Сүүлийн 30 хоногийн мэдээг долоо хоног бүр эх хуудастай нь дахин тулгаж шалгадаг." />;
  }
  return (
    <ol className="flex flex-col gap-3">
      {items.map((c) => (
        <li key={c.slug} className="flex flex-col gap-1.5 rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset">
          <p className="text-xs font-semibold text-warning-primary">
            {c.status === "gone" ? "⚠️ Эх хуудас нээгдэхгүй болсон" : `✏️ Текст өөрчлөгдсөн · ${c.edits} өгүүлбэр`} · {formatDateMn(c.changedAt)}
          </p>
          <Link href={`/article/${c.slug}`} className="font-semibold text-balance text-primary hover:text-brand-secondary">
            {c.title}
          </Link>
          <p className="text-xs text-quaternary">
            {c.sourceName} · анх {formatDateMn(c.publishedAt)}-нд нийтэлсэн
          </p>
        </li>
      ))}
    </ol>
  );
}

export default function ChangesPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader
        eyebrow="🔁 Эх хуудасны өөрчлөлт"
        title="Төрийн сайт юуг засаж, юуг устгав?"
        description="Сүүлийн 30 хоногийн мэдээ бүрийг долоо хоног тутам эх хуудастай нь дахин тулгадаг. Текст өөрчлөгдсөн бол хуучин, шинэ өгүүлбэрийг зэрэгцүүлж, хуудас устсан бол бидний хадгалсан анхны текстийг харуулна. Өөрчлөлт нь алдаа засвар ч байж болно."
      >
        <div className="flex flex-wrap gap-2">
          <ShareButton path="/changes" title="Төрийн сайт юуг засаж, юуг устгав?" className="w-fit" />
          <Link href="/method#recheck" className="flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-secondary ring-1 ring-primary ring-inset hover:bg-primary_hover">
            Хэрхэн шалгадаг вэ
          </Link>
        </div>
      </PageHeader>
      <Suspense fallback={<FeedSkeleton />}>
        <Changes />
      </Suspense>
    </div>
  );
}
