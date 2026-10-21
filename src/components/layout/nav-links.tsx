"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/utils/cx";

export const NAV_ITEMS = [
  { href: "/", label: "Нүүр" },
  { href: "/digest", label: "Онцлох тойм" },
  { href: "/officials", label: "Улстөрчид" },
  { href: "/budget", label: "Төсөв" },
  { href: "/tax", label: "Миний татвар" },
  { href: "/data", label: "Өгөгдөл" },
  { href: "/risk", label: "Эрсдэл" },
  { href: "/clusters", label: "Сэдвүүд" },
  { href: "/sources", label: "Эх сурвалж" },
  { href: "/transparency", label: "Ил тод тайлан" },
];

/**
 * Active-link highlighting needs usePathname(), which suspends on routes whose params are
 * only known at request time (new articles served via ISR). Always render inside <Suspense>
 * with <NavLinksFallback> (same links, no highlight) so the layout shell stays prerendered.
 */
export function NavLinks(props: { className?: string; onNavigate?: () => void }) {
  return <NavList {...props} pathname={usePathname()} />;
}

export function NavLinksFallback(props: { className?: string; onNavigate?: () => void }) {
  return <NavList {...props} pathname={null} />;
}

function NavList({ className, onNavigate, pathname }: { className?: string; onNavigate?: () => void; pathname: string | null }) {
  return (
    <nav className={className} aria-label="Үндсэн цэс">
      {NAV_ITEMS.map((item) => {
        const active = pathname !== null && (item.href === "/" ? pathname === "/" : pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-lg px-2 py-2 text-sm font-semibold whitespace-nowrap transition",
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
