import type { Metadata } from "next";
import { Suspense } from "react";

import { ArticleGrid } from "@/components/iltod/article-grid";
import { Empty } from "@/components/iltod/empty";
import { PageHeader } from "@/components/iltod/page-header";
import { FeedSkeleton } from "@/components/iltod/skeletons";
import { getFeed } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Эрсдэлтэй Тендер & Төсөв",
  description: "AI эрсдэлийн оноо 65-аас дээш гарсан тендер, төсөв, шийдвэрүүд Grok-ийн гүнзгий шинжилгээтэй.",
};

async function RiskFeed() {
  const [risky, budget] = await Promise.all([getFeed("risk", 30), getFeed("budget", 12)]);
  const riskyIds = new Set(risky.map((a) => a.id));
  const otherBudget = budget.filter((a) => !riskyIds.has(a.id));
  return (
    <div className="flex flex-col gap-12">
      {risky.length ? (
        <ArticleGrid articles={risky} />
      ) : (
        <Empty title="Өндөр эрсдэлтэй зүйл илрээгүй" description="Эрсдэлийн оноо 65-аас дээш гарсан тендер, төсөв энд автоматаар нэмэгдэнэ." />
      )}
      {otherBudget.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-primary">💰 Бусад төсөв, мөнгөн дүнтэй мэдээ</h2>
          <ArticleGrid articles={otherBudget} />
        </section>
      )}
    </div>
  );
}

export default function RiskPage() {
  return (
    <>
      <PageHeader
        eyebrow="🚨 Өндөр эрсдэлтэй"
        title="Эрсдэлтэй Тендер & Төсөв"
        description="Шууд гэрээ, тендергүй худалдан авалт, тодорхойгүй зарцуулалт, ашиг сонирхлын зөрчлийн шинжтэй мэдээ. Оноо нь буруутгал биш, иргэд анхаарч асуух ёстой дохио юм."
      />
      <Suspense fallback={<FeedSkeleton />}>
        <RiskFeed />
      </Suspense>
    </>
  );
}
