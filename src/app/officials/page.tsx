import type { Metadata } from "next";
import Link from "next/link";

import { Empty } from "@/components/iltod/empty";
import { PageHeader } from "@/components/iltod/page-header";
import { ShareButton } from "@/components/iltod/share-button";
import { MyMps } from "@/components/officials/follow";
import { OfficialsTable } from "@/components/officials/officials-table";
import { getPoliticians } from "@/lib/queries";

export const metadata: Metadata = {
  title: "УИХ-ын гишүүдийн хөрөнгө, орлогын мэдүүлэг",
  description: "Улсын Их Хурлын 126 гишүүний Авлигатай тэмцэх газарт гаргасан хөрөнгө, орлогын мэдүүлэг жил бүрээр: орлого, үл хөдлөх, тээврийн хэрэгсэл, хадгаламж, зээл.",
  alternates: { canonical: "/officials" },
};

export default async function OfficialsPage() {
  const people = await getPoliticians();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Улстөрчдийн хөрөнгө"
        title="УИХ-ын гишүүдийн хөрөнгө, орлого"
        description={
          <>
            Авлигатай тэмцэх газрын ХАСХОМ системд нийтлэгдсэн албан ёсны мэдүүлэг (Авлигын эсрэг хуулийн 14.3), сүүлийн 5 жилээр. Гишүүдийн жагсаалт parliament.mn-ээс долоо хоног бүр шинэчлэгдэж, сонгуулийн
            дараа автоматаар солигдоно. Мэдүүлэг бол буруутгал биш; тоо бүр эх сурвалжийн холбоостой.
          </>
        }
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/officials/companies" className="rounded-lg bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-solid_hover">
            🏢 Төрийн өмчит компаниуд
          </Link>
          <ShareButton path="/officials" title="УИХ-ын гишүүдийн хөрөнгө, орлогын мэдүүлэг" />
        </div>
      </PageHeader>
      {people.length > 0 && <MyMps people={people} />}
      {people.length ? <OfficialsTable people={people} /> : <Empty title="Мэдүүлэг хараахан ачаалагдаагүй" description="Гишүүдийн жагсаалт болон мэдүүлгийг долоо хоног бүр автоматаар татна." />}
    </div>
  );
}
