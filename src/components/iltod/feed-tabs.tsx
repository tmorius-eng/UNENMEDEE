import Link from "next/link";

import type { FeedFilter } from "@/lib/queries";
import { cx } from "@/utils/cx";

export const FEED_TABS: { id: FeedFilter; label: string }[] = [
  { id: "all", label: "Бүгд" },
  { id: "risk", label: "🚨 Өндөр эрсдэлтэй" },
  { id: "budget", label: "💰 Төсөв ба Тендер" },
  { id: "ministry", label: "🏛️ Яамдын шийдвэр" },
  { id: "local", label: "🏞️ Орон нутаг" },
];

/** URL-driven filter tabs (shareable links, work without JavaScript). */
export function FeedTabs({ active }: { active: FeedFilter }) {
  return (
    <nav aria-label="Мэдээний шүүлтүүр" className="scrollbar-hide -mx-4 overflow-x-auto px-4">
      <ul className="flex w-max gap-1 rounded-xl bg-secondary_alt p-1 ring-1 ring-secondary ring-inset">
        {FEED_TABS.map((t) => (
          <li key={t.id}>
            <Link
              href={t.id === "all" ? "/" : `/?f=${t.id}`}
              scroll={false}
              aria-current={active === t.id ? "page" : undefined}
              className={cx(
                "block rounded-lg px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition",
                active === t.id ? "bg-primary text-secondary shadow-sm ring-1 ring-secondary ring-inset" : "text-quaternary hover:text-secondary",
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
