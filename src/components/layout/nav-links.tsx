"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/utils/cx";

export const NAV_ITEMS = [
  { href: "/", label: "Нүүр" },
  { href: "/risk", label: "Эрсдэлтэй Тендер & Төсөв" },
  { href: "/clusters", label: "Кластер Сэдвүүд" },
  { href: "/sources", label: "Эх сурвалжууд" },
  { href: "/transparency", label: "Ил Тод Байдлын Тайлан" },
];

export function NavLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className={className} aria-label="Үндсэн цэс">
      {NAV_ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition",
              active ? "bg-active text-secondary" : "text-quaternary hover:bg-primary_hover hover:text-secondary",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
