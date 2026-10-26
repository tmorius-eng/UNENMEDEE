import Link from "next/link";

import { PLACES } from "@/lib/places";
import { cx } from "@/utils/cx";

/** Every aimag, the capital and its districts as plain links (server markup, no client JS). */
export function PlacePicker({ current, title = "Миний аймаг, дүүрэг" }: { current?: string; title?: string }) {
  const groups = [
    { label: "Нийслэл, дүүрэг", items: PLACES.filter((p) => p.kind !== "aimag") },
    { label: "Аймаг", items: PLACES.filter((p) => p.kind === "aimag") },
  ];
  return (
    <nav id="places" aria-label={title} className="flex scroll-mt-24 flex-col gap-3 rounded-2xl bg-secondary p-4 ring-1 ring-line-soft ring-inset">
      <h2 className="label-mono text-tertiary">{title}</h2>
      {groups.map((g) => (
        <div key={g.label} className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-secondary">{g.label}</p>
          <ul className="flex flex-wrap gap-2">
            {g.items.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/place/${p.slug}`}
                  prefetch={false}
                  aria-current={p.slug === current ? "page" : undefined}
                  className={cx(
                    "inline-flex h-9 items-center rounded-full px-3 text-sm font-medium ring-1 ring-inset transition",
                    p.slug === current ? "bg-ink text-bg-primary ring-transparent" : "bg-primary text-secondary ring-line hover:text-primary",
                  )}
                >
                  {p.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
