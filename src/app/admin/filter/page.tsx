import { ArrowLeft } from "@untitledui/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { FilterChat } from "@/components/admin/filter-chat";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Тархи угаалтын шүүлтүүр", robots: { index: false } };
// DeepSeek + Grok can take a while on long texts.
export const maxDuration = 60;

async function Guarded() {
  await requireAdmin();
  return <FilterChat />;
}

export default function FilterPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-tertiary hover:text-secondary">
        <ArrowLeft className="size-4" /> Самбар
      </Link>
      <div>
        <h1 className="text-display-xs font-semibold text-primary">🧠 Тархи угаалтын шүүлтүүр</h1>
        <p className="mt-1 text-sm text-tertiary">URL эсвэл текст оруулаад DeepSeek + Grok шүүлтүүрээр шалгаж, нэг товчоор нийтэлнэ.</p>
      </div>
      <Suspense fallback={<div className="h-[520px] animate-pulse rounded-3xl bg-primary ring-1 ring-secondary ring-inset" />}>
        <Guarded />
      </Suspense>
    </div>
  );
}
