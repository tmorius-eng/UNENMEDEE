import Link from "next/link";
import { Suspense } from "react";

import { getSiteStats } from "@/lib/queries";

import { NotifyButton } from "@/components/pwa/pwa-controls";

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
          <span className="hidden sm:inline">Нээлттэй эх · Бүх зардал олон нийтэд ил</span>
        </div>
      </div>
      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-8">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>
        <Suspense fallback={<NavLinksFallback className="ml-4 hidden items-center gap-0.5 lg:flex" />}>
          <NavLinks className="ml-4 hidden items-center gap-0.5 lg:flex" />
        </Suspense>
        <div className="ml-auto flex items-center gap-1">
          <NotifyButton />
          <TextSizeToggle />
          <ThemeToggle />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
