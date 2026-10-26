"use client";

import { Menu02, XClose } from "@untitledui/icons";
import Link from "next/link";
import { Suspense, useState } from "react";

import { NavLinks, NavLinksFallback } from "./nav-links";
import { HEADER_ICON_BUTTON } from "./header-styles";
import { SocialLinks } from "./social-links";
import { TextSizeToggle } from "./text-size-toggle";
import { ThemeToggle } from "./theme-toggle";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="xl:hidden">
      <button type="button" aria-expanded={open} aria-label={open ? "Цэс хаах" : "Цэс нээх"} onClick={() => setOpen((v) => !v)} className={HEADER_ICON_BUTTON}>
        {open ? <XClose className="size-[18px]" /> : <Menu02 className="size-[18px]" />}
      </button>
      {open && (
        <div className="menu-enter absolute inset-x-0 top-full origin-top border-b border-line bg-primary/95 px-4 py-3 shadow-lg backdrop-blur-xl">
          <Suspense fallback={<NavLinksFallback className="flex flex-col gap-0.5" onNavigate={() => setOpen(false)} />}>
            <NavLinks className="flex flex-col gap-0.5" onNavigate={() => setOpen(false)} />
          </Suspense>
          <Link href="/support" onClick={() => setOpen(false)} className="mt-2 block border-t border-line-soft px-3 pt-3 pb-1 text-sm font-semibold text-brand-secondary">
            💙 Ил тод мэдээг дэмжих (хандив)
          </Link>
          <div className="mt-2 flex items-center gap-3 border-t border-line-soft px-3 pt-3 pb-1">
            <span className="label-mono text-tertiary">Биднийг дагаарай</span>
            <SocialLinks size="md" className="ml-auto" />
          </div>
          <div className="mt-2 flex items-center gap-1 border-t border-line-soft px-1 pt-2 sm:hidden">
            <span className="label-mono px-2 text-tertiary">Үсгийн хэмжээ</span>
            <TextSizeToggle />
            <span className="label-mono ml-auto px-2 text-tertiary">Өнгө</span>
            <ThemeToggle />
          </div>
        </div>
      )}
    </div>
  );
}
