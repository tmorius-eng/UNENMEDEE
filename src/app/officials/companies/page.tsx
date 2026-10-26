import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Empty } from "@/components/iltod/empty";
import { PageHeader } from "@/components/iltod/page-header";
import { ShareButton } from "@/components/iltod/share-button";
import { type SoeRow, SoeTable } from "@/components/officials/soe-table";
import { formatMntShort, formatNumber } from "@/lib/format";
import { getIndicator } from "@/lib/queries";
import { SOE_SOURCE_URL, type SoeSnapshot } from "@/lib/soe/shilendans";

export const metadata: Metadata = {
  title: "Төрийн өмчит компаниуд — орлого, ашиг, цалингийн сан",
  alternates: { canonical: "/officials/companies" },
  description: "Төрийн болон орон нутгийн өмчит компани, үйлдвэрийн газруудын жилийн орлого, зардал, цэвэр ашиг, цалингийн сан, ажилтны тоо. Шилэн дансанд тайлагнасан албан тоо.",
};

function Tile({ label, value, sub, bad }: { label: string; value: string; sub?: string; bad?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-t border-line-soft py-3">
      <p className="label-mono truncate text-tertiary">{label}</p>
      <p className="num-mono text-lg text-primary md:text-xl">{value}</p>
      {sub && <p className={bad ? "text-xs text-risk" : "text-xs text-tertiary"}>{sub}</p>}
    </div>
  );
}

async function Companies() {
  const snap = await getIndicator<SoeSnapshot>("soe_finance");
  if (!snap) return <Empty title="Өгөгдөл хараахан татагдаагүй" description="Шилэн дансны тайланг өдөр бүр автоматаар шинэчилнэ." />;
  const { year, companies } = snap.data;
  const sum = (k: "revenue" | "netProfit" | "wageFund" | "staff") => companies.reduce((a, c) => a + (c[k] ?? 0), 0);
  const losses = companies.filter((c) => (c.netProfit ?? 0) < 0).length;
  const rows: SoeRow[] = companies.map((c) => ({
    name: c.name,
    kind: c.kind,
    governor: c.governor,
    revenue: c.revenue ?? null,
    expenses: c.expenses ?? null,
    netProfit: c.netProfit ?? null,
    wageFund: c.wageFund ?? null,
    staff: c.staff ?? null,
  }));
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label={`${year} оны нийт орлого`} value={formatMntShort(sum("revenue"))} sub={`${companies.length} байгууллага тайлагнасан`} />
        <Tile label="Нийт цэвэр ашиг" value={formatMntShort(sum("netProfit"))} sub={`${losses} нь алдагдалтай`} bad={losses > 0} />
        <Tile label="Нийт цалингийн сан" value={formatMntShort(sum("wageFund"))} />
        <Tile label="Нийт ажилтан" value={formatNumber(sum("staff"))} />
      </div>

      <section aria-labelledby="ceo" className="flex flex-col gap-2 rounded-3xl bg-signal-soft p-5 ring-1 ring-line ring-inset">
        <h2 id="ceo" className="text-md font-semibold text-primary">
          Захирлуудын цалин яагаад энд байхгүй вэ?
        </h2>
        <p className="text-sm text-secondary">
          Компани тус бүрийн захирлын цалинг одоогоор аль ч албан эх сурвалж нээлттэй нийтэлдэггүй: Шилэн дансанд зөвхөн нийт цалингийн сан бий. Үндэсний аудитын газрын судалгаагаар 2025 онд 110 төрийн
          өмчит компанийн 349 удирдах албан тушаалтан нийт 34.5 тэрбум ₮ цалин авсан, хамгийн өндөр нь жилд 778.8 сая ₮ байсан (
          <a href="https://ikon.mn/n/3ojq" target="_blank" rel="noreferrer" className="font-semibold text-brand-secondary hover:underline">
            ikon.mn, 2026-06-26
          </a>
          ). Компани, хүний нэрийг тэр судалгаа нэрлээгүй. Сошиал сүлжээгээр тарсан хүснэгтүүдийг эх сурвалжгүй тул бид нийтлэхгүй.
        </p>
      </section>

      <SoeTable rows={rows} />
    </div>
  );
}

export default function CompaniesPage() {
  return (
    <>
      <PageHeader
        eyebrow="🏢 Төрийн өмч"
        title="Төрийн өмчит компаниуд"
        description={
          <>
            Төрийн болон орон нутгийн өмчит компани, үйлдвэрийн газрууд жил бүрийн гүйцэтгэлээ{" "}
            <a href={SOE_SOURCE_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-secondary hover:underline">
              Шилэн дансанд
            </a>{" "}
            тайлагнадаг. Энд тэдний орлого, зардал, ашиг, цалингийн санг харуулав. Өөрсдөө тайлагнасан, аудитлагдаагүй тоо; хоцорч тайлагнасан нь орохгүй байж болно.{" "}
            <Link href="/officials" className="font-semibold text-brand-secondary hover:underline">
              ← УИХ-ын гишүүд
            </Link>
          </>
        }
      >
        <ShareButton path="/officials/companies" title="Төрийн өмчит компаниуд: орлого, ашиг, цалингийн сан" className="w-fit" />
      </PageHeader>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-primary ring-1 ring-line ring-inset" />}>
        <Companies />
      </Suspense>
    </>
  );
}
