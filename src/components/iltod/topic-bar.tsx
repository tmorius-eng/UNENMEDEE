"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

import { TOPICS } from "@/lib/topics";
import { cx } from "@/utils/cx";

const ITEMS: { key: string; label: string; href: string }[] = [
  { key: "all", label: "Бүгд", href: "/" },
  { key: "digest", label: "Онцлох тойм", href: "/digest" },
  { key: "risk", label: "🚨 Эрсдэл", href: "/?f=risk" },
  ...TOPICS.filter((t) => t.key !== "data").map((t) => ({ key: t.key, label: t.label, href: `/?f=${t.key}` })),
  { key: "data", label: "Тоо баримт", href: "/data" },
];

/**
 * Kagi-style topic tabs: a scrollable strip pinned to the bottom of the screen on phones
 * (thumb reach), inline above the list on larger screens. The active tab scrolls into view.
 */
export function TopicBar({ active, placement }: { active: string; placement: "bottom" | "inline" }) {
  const activeRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [active]);

  return (
    <nav
      aria-label="Сэдвүүд"
      className={cx(
        placement === "bottom"
          ? "fixed inset-x-0 bottom-0 z-30 border-t border-secondary bg-primary/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
          : "hidden border-b border-secondary md:block",
      )}
    >
      <ul className="scrollbar-hide flex gap-1 overflow-x-auto px-2">
        {ITEMS.map((it) => {
          const isActive = it.key === active;
          return (
            <li key={it.key} className="shrink-0">
              <Link
                ref={isActive ? activeRef : undefined}
                href={it.href}
                scroll={it.href.startsWith("/?") ? false : undefined}
                aria-current={isActive ? "page" : undefined}
                className={cx(
                  "relative block px-3 py-3.5 text-md whitespace-nowrap transition-colors",
                  isActive ? "font-semibold text-primary" : "text-tertiary hover:text-secondary",
                )}
              >
                {it.label}
                {isActive && <span aria-hidden className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-brand-solid" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
