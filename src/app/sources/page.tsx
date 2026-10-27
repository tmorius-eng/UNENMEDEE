import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Badge, BadgeWithDot } from "@/components/base/badges/badges";
import { PageHeader } from "@/components/iltod/page-header";
import { TimeAgo } from "@/components/iltod/time-ago";
import { CATEGORY_LABEL } from "@/lib/format";
import { getSources, type SourceHealth } from "@/lib/queries";
import type { SourceCategory } from "@/lib/types";

export const metadata: Metadata = {
  title: "Эх сурвалжууд — хянаж буй төрийн сайтууд",
  alternates: { canonical: "/sources" },
  description: "ИЛ ТОД-ийн автоматаар хянаж буй бүх төрийн вэбсайт, тэдгээрийн төлөв.",
};

const ORDER: SourceCategory[] = ["portal", "ministry", "agency", "local"];

function Status({ s }: { s: SourceHealth }) {
  if (!s.isActive) return <Badge type="pill-color" color="gray" size="sm">Идэвхгүй</Badge>;
  if (!s.lastScrapedAt) return <BadgeWithDot type="pill-color" color="gray" size="sm">Хүлээгдэж буй</BadgeWithDot>;
  if (s.consecutiveFailures > 0)
    return (
      <BadgeWithDot type="pill-color" color="warning" size="sm">
        Хандаж чадсангүй ×{s.consecutiveFailures}
      </BadgeWithDot>
    );
  return <BadgeWithDot type="pill-color" color="success" size="sm">Хэвийн</BadgeWithDot>;
}

async function SourceTable() {
  const rows = await getSources();
  return (
    <div className="flex flex-col gap-10">
      {ORDER.map((cat) => {
        const group = rows.filter((r) => r.category === cat);
        if (!group.length) return null;
        return (
          <section key={cat} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-primary">
              {CATEGORY_LABEL[cat]} <span className="text-tertiary">({group.length})</span>
            </h2>
            <div className="overflow-x-auto rounded-2xl bg-primary ring-1 ring-line ring-inset">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-line bg-secondary text-xs font-semibold text-tertiary">
                  <tr>
                    <th className="px-4 py-3">Байгууллага</th>
                    <th className="px-4 py-3">Домэйн</th>
                    <th className="px-4 py-3 text-right">Мэдээ</th>
                    <th className="px-4 py-3">Сүүлд шалгасан</th>
                    <th className="px-4 py-3">Төлөв</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {group.map((s) => (
                    <tr key={s.id} className="hover:bg-primary_hover">
                      <td className="px-4 py-3 font-medium text-primary">
                        {s.visibleCount > 0 ? (
                          <Link href={`/source/${s.domain}`} prefetch={false} className="hover:text-brand-secondary hover:underline">
                            {s.name}
                          </Link>
                        ) : (
                          s.name
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <a href={`https://${s.domain}`} target="_blank" rel="noreferrer" className="text-brand-secondary hover:underline">
                          {s.domain}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-right text-secondary tabular-nums">{s.articleCount}</td>
                      <td className="px-4 py-3 text-tertiary">{s.lastScrapedAt ? <TimeAgo date={s.lastScrapedAt} /> : "—"}</td>
                      <td className="px-4 py-3" title={s.lastError ?? undefined}>
                        <Status s={s} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function SourcesPage() {
  return (
    <>
      <PageHeader
        eyebrow="🏛️ Хяналт"
        title="Хянаж буй эх сурвалжууд"
        description="Яам, агентлаг, аймаг, хурлын вэбсайтуудыг robots.txt-г хүндэтгэн, нэг домэйнд 8 секундээс доошгүй завсартайгаар уншдаг. Шинэ төрийн сайтыг автоматаар илрүүлж нэмдэг."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-primary ring-1 ring-line ring-inset" />}>
        <SourceTable />
      </Suspense>
    </>
  );
}
