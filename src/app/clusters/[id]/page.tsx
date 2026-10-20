import { ArrowLeft } from "@untitledui/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AIMessage } from "@/components/iltod/ai-message";
import { ArticleGrid } from "@/components/iltod/article-grid";
import { RiskBadge } from "@/components/iltod/badges";
import { FeedSkeleton } from "@/components/iltod/skeletons";
import { getCluster, getClusters } from "@/lib/queries";

export async function generateStaticParams() {
  const clusters = await getClusters(20);
  return (clusters.length ? clusters.map((c) => String(c.id)) : ["0"]).map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/clusters/[id]">): Promise<Metadata> {
  const data = await getCluster(Number((await params).id));
  return { title: data?.cluster.title ?? "Кластер" };
}

async function ClusterView({ params }: { params: PageProps<"/clusters/[id]">["params"] }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const data = await getCluster(id);
  if (!data) notFound();
  const { cluster, articles } = data;
  return (
    <div className="flex flex-col gap-8">
      <Link href="/clusters" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-tertiary hover:text-secondary">
        <ArrowLeft className="size-4" /> Бүх кластер
      </Link>
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm text-tertiary">
          {cluster.articleCount} эх сурвалжийн мэдээ {cluster.maxRiskScore >= 35 && <RiskBadge score={cluster.maxRiskScore} />}
        </div>
        <h1 className="text-display-xs font-semibold tracking-tight text-balance text-primary md:text-display-sm">{cluster.title}</h1>
      </header>
      {cluster.synthesisSummary && (
        <AIMessage tier={cluster.maxRiskScore >= 65 ? "tier2" : "tier1"} title="Эх сурвалжуудыг нэгтгэсэн дүгнэлт" markdown={cluster.synthesisSummary} />
      )}
      <ArticleGrid articles={articles} />
    </div>
  );
}

export default function ClusterPage(props: PageProps<"/clusters/[id]">) {
  return (
    <Suspense fallback={<FeedSkeleton count={3} />}>
      <ClusterView params={props.params} />
    </Suspense>
  );
}
