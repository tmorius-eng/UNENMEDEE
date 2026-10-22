import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Empty } from "@/components/iltod/empty";
import { PageHeader } from "@/components/iltod/page-header";
import { ShareButton } from "@/components/iltod/share-button";
import { FeedSkeleton } from "@/components/iltod/skeletons";
import { formatDateMn, tldrSentences } from "@/lib/format";
import { getLegalActs } from "@/lib/queries";
import { safeHttpUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Шинэ хууль, тогтоол — юу өөрчлөгдөж байна вэ",
  alternates: { canonical: "/laws" },
  description: "Хууль зүйн мэдээллийн нэгдсэн системд (legalinfo.mn) шинээр бүртгэгдсэн хууль, УИХ, Засгийн газрын тогтоол, сайдын тушаал, AI-ын товч тайлбартай.",
};

async function Acts() {
  const acts = await getLegalActs();
  if (acts.length === 0) return <Empty title="Шинэ акт хараахан татагдаагүй" description="legalinfo.mn-ээс 2 цаг тутам шинэчилнэ." />;
  const byDay = new Map<string, typeof acts>();
  for (const a of acts) {
    const day = formatDateMn(a.publishedAt);
    byDay.set(day, [...(byDay.get(day) ?? []), a]);
  }
  return (
    <div className="flex flex-col gap-8">
      {[...byDay.entries()].map(([day, list]) => (
        <section key={day} aria-label={day} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-tertiary">{day}</h2>
          <ol className="flex flex-col gap-3">
            {list.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset">
                <Link href={`/article/${a.slug}`} className="font-semibold text-balance text-primary hover:text-brand-secondary">
                  {a.title}
                </Link>
                {a.tldr && (
                  <ul className="flex flex-col gap-1 text-sm text-secondary">
                    {tldrSentences(a.tldr, 2).map((s) => (
                      <li key={s} className="flex gap-2">
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-solid" />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
                <a href={safeHttpUrl(a.originalUrl)} target="_blank" rel="noreferrer" className="w-fit text-xs font-semibold text-brand-secondary hover:underline">
                  Эх бичвэр legalinfo.mn →
                </a>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

export default function LawsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col">
      <PageHeader
        eyebrow="⚖️ Хууль, тогтоол"
        title="Юу шинээр батлагдав?"
        description="Хууль зүйн мэдээллийн нэгдсэн системд (legalinfo.mn) шинээр бүртгэгдсэн хууль, тогтоол, тушаал. Товч тайлбарыг AI бичсэн тул хүчин төгөлдөр текстийг эх бичвэрээс уншина уу."
      >
        <ShareButton path="/laws" title="Шинэ хууль, тогтоол: юу өөрчлөгдөж байна вэ" className="w-fit" />
      </PageHeader>
      <Suspense fallback={<FeedSkeleton />}>
        <Acts />
      </Suspense>
    </div>
  );
}
