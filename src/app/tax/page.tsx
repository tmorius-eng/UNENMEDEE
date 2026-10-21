import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Empty } from "@/components/iltod/empty";
import { PageHeader } from "@/components/iltod/page-header";
import { ShareButton } from "@/components/iltod/share-button";
import { TaxReceiptCalculator } from "@/components/iltod/tax-receipt";
import type { BudgetNsoSnapshot } from "@/lib/budget/nso";
import { getIndicator } from "@/lib/queries";
import { sharesFromSpending } from "@/lib/tax/receipt";

export const metadata: Metadata = {
  title: "Миний татвар хаашаа явдаг вэ? Тооцоолуур",
  alternates: { canonical: "/tax" },
  description: "Цалингийн татвар, НӨАТ-аа оруулаад таны төлсөн мөнгө улсын төсөвт юунд зарцуулагддагийг 1 минутад харна. Үндэсний статистикийн хорооны албан тоогоор.",
};

async function Calculator() {
  const nso = await getIndicator<BudgetNsoSnapshot>("budget_nso");
  const economic = nso?.data.spending.economic;
  const year = economic && [...economic.years].reverse().find((y) => economic.total[y]);
  if (!economic || !year) return <Empty title="Төсвийн өгөгдөл хараахан татагдаагүй" description="Удахгүй шинэчлэгдэнэ." />;
  return <TaxReceiptCalculator shares={sharesFromSpending(economic.categories, year)} year={year} />;
}

export default function TaxPage() {
  return (
    <>
      <PageHeader
        eyebrow="🧾 Миний татвар"
        title="Таны татвар юунд зарцуулагддаг вэ?"
        description={
          <>
            Сард төлдөг татвараа оруулаарай. Оруулсан тоо тань зөвхөн таны төхөөрөмж дээр тооцоологдоно, хаашаа ч илгээгдэхгүй. Төсвийн бүтэц:{" "}
            <Link href="/budget" className="font-semibold text-brand-secondary hover:underline">
              Улсын төсөв
            </Link>{" "}
            (ҮСХ, Сангийн яам).
          </>
        }
      >
        <ShareButton path="/tax" title="Миний татвар хаашаа явдаг вэ? 1 минутад тооцоол" className="w-fit" />
      </PageHeader>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-primary ring-1 ring-secondary ring-inset" />}>
        <Calculator />
      </Suspense>
    </>
  );
}
