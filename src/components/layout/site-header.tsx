import { GitBranch01 } from "@untitledui/icons";
import Link from "next/link";
import { Suspense } from "react";

import { getSiteStats } from "@/lib/queries";

import { NotifyButton } from "@/components/pwa/pwa-controls";

import { MobileMenu } from "./mobile-menu";
import { NavLinks, NavLinksFallback } from "./nav-links";
import { TextSizeToggle } from "./text-size-toggle";
import { ThemeToggle } from "./theme-toggle";

const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || "https://github.com/tmorius-eng/UNENMEDEE";

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
        <Link href="/" className="flex items-center gap-2.5" aria-label="ИЛ ТОД нүүр хуудас">
          <span className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-600 to-fuchsia-500 text-sm font-bold text-white shadow-md">ИТ</span>
          <span className="text-lg font-bold tracking-tight text-primary">
            ИЛ&nbsp;ТОД<span className="text-brand-secondary">.</span>
          </span>
        </Link>
        <Suspense fallback={<NavLinksFallback className="ml-4 hidden items-center gap-0.5 lg:flex" />}>
          <NavLinks className="ml-4 hidden items-center gap-0.5 lg:flex" />
        </Suspense>
        <div className="ml-auto flex items-center gap-1">
          <a
            href={REPO}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-quaternary transition hover:bg-primary_hover hover:text-secondary sm:flex"
          >
            <GitBranch01 className="size-4" /> GitHub
          </a>
          <NotifyButton />
          <TextSizeToggle />
          <ThemeToggle />
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
