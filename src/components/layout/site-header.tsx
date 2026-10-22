import { SearchLg } from "@untitledui/icons";
import Link from "next/link";
import { Suspense } from "react";

import { getSiteStats } from "@/lib/queries";

import { NotifyButton } from "@/components/pwa/pwa-controls";

import { DonateChip } from "./donate";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { NavLinks, NavLinksFallback } from "./nav-links";
import { TextSizeToggle } from "./text-size-toggle";
import { ThemeToggle } from "./theme-toggle";

async function LiveStatus() {
  const stats = await getSiteStats();
  return (
    <span className="flex items-center gap-2">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-success-solid opacity-60" />
        <span className="relative inline-flex size-2 rounded-full bg-success-solid" />
      </span>
      Систем идэвхтэй: {stats.activeSources} төрийн эх сурвалж хянаж байна
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-secondary bg-primary/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      {/* Status strip: desktop only; phones keep the screen for headlines. */}
      <div className="hidden border-b border-secondary bg-secondary_alt sm:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5 text-xs font-medium text-tertiary md:px-8">
          <Suspense fallback={<span>Систем ачаалж байна…</span>}>
            <LiveStatus />
          </Suspense>
          <Suspense fallback={<span className="hidden xl:inline">Нээлттэй эх · Бүх зардал олон нийтэд ил</span>}>
            <DonateChip className="hidden xl:flex" />
          </Suspense>
        </div>
      </div>
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-8">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <Suspense fallback={<NavLinksFallback skipHome more className="ml-2 hidden min-w-0 items-center xl:flex" />}>
          <NavLinks skipHome more className="ml-2 hidden min-w-0 items-center xl:flex" />
        </Suspense>
        {/* The nav is hidden below xl: the empty middle of the bar shows the donation chip. */}
        <Suspense fallback={null}>
          <DonateChip className="mx-auto hidden rounded-full bg-secondary px-3 py-1.5 sm:flex xl:hidden" />
        </Suspense>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/search" aria-label="Хайх" title="Хайх" className="flex size-10 items-center justify-center rounded-lg text-fg-quaternary transition hover:bg-primary_hover hover:text-fg-secondary">
            <SearchLg className="size-5" aria-hidden />
          </Link>
          <NotifyButton />
          {/* Below sm (≤ 360 px phones) these two move into the menu, or the row overflows. */}
          <div className="hidden sm:contents">
            <TextSizeToggle />
            <ThemeToggle />
          </div>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
