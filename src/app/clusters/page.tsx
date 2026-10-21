import type { Metadata } from "next";
import { Suspense } from "react";

import { ClusterCard } from "@/components/iltod/cluster-card";
import { Empty } from "@/components/iltod/empty";
import { PageHeader } from "@/components/iltod/page-header";
import { FeedSkeleton } from "@/components/iltod/skeletons";
import { getClusters } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Сэдвүүд — олон эх сурвалжийн харьцуулалт",
  alternates: { canonical: "/clusters" },
  description: "Олон төрийн байгууллага нэг сэдвийг хэрхэн мэдээлж байгааг AI нэгтгэн харьцуулсан сэдвүүд.",
};

async function ClusterList() {
  const clusters = await getClusters(48);
  if (!clusters.length) {
    return <Empty title="Кластер хараахан алга" description="Хоёр ба түүнээс дээш эх сурвалж нэг сэдвийг мэдээлэхэд энд нэгтгэгдэнэ." />;
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {clusters.map((c) => (
        <ClusterCard key={c.id} cluster={c} />
      ))}
    </div>
  );
}

export default function ClustersPage() {
  return (
    <>
      <PageHeader
        eyebrow="🔗 Олон эх сурвалж"
        title="Кластер Сэдвүүд"
        description="Нэг сэдвийг өөр өөр байгууллага хэрхэн мэдээлсэн бэ? Давхцаж буй баримт, зөрүүтэй мэдээллийг нэг дор харьцуул."
      />
      <Suspense fallback={<FeedSkeleton />}>
        <ClusterList />
      </Suspense>
    </>
  );
}
