"use client";

import Link from "next/link";

import { Empty } from "@/components/iltod/empty";

/**
 * A page that failed to render (a database blip: `safe()` rethrows at runtime so nothing empty is
 * cached). The header and footer stay; the reader can retry in place.
 */
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="py-12">
      <Empty title="Түр алдаа гарлаа" description="Мэдээллийн сантай холбогдож чадсангүй. Хэсэг хугацааны дараа дахин оролдоно уу.">
        <div className="flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => retry()} className="rounded-lg bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-solid_hover">
            Дахин оролдох
          </button>
          <Link href="/" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-secondary ring-1 ring-primary hover:bg-primary_hover">
            Нүүр хуудас руу
          </Link>
        </div>
      </Empty>
    </div>
  );
}
