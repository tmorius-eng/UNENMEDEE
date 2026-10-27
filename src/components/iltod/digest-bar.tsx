"use client";

import { ArrowLeft, ArrowRight, XClose } from "@untitledui/icons";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { clearTrail, loadTrail, parseTrail, trailPosition } from "@/lib/digest-trail";
import { useLocalStorage } from "@/lib/local-store";
import { addIds, READ_KEY } from "@/lib/read-state";

const noop = () => () => {};

/**
 * "← Тойм · 3/10 · Дараагийнх →" at the bottom of an article opened from /digest (this tab only,
 * `digest-trail.ts`). The server snapshot is null, so the prerendered page is unchanged and an
 * article reached any other way never shows it. "← Тойм" goes back to the story's own row on
 * /digest; "Дараагийнх" opens the next story of the edition and marks it read.
 */
export function DigestBar({ slug }: { slug: string }) {
  const raw = useSyncExternalStore(noop, loadTrail, () => null);
  const [readRaw, setRead] = useLocalStorage(READ_KEY, "[]");
  const [closed, setClosed] = useState(false);
  const pos = trailPosition(parseTrail(raw), slug);
  if (!pos || closed) return null;

  return (
    <>
      {/* Room for the bar, so it never covers the end of the article. */}
      <div aria-hidden className="h-16" />
      <nav
        aria-label="Тоймын мэдээ"
        className="sheet-enter fixed inset-x-0 bottom-0 z-30 border-t border-line bg-primary/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      >
        <div className="mx-auto flex max-w-[45rem] items-center gap-2 px-4 py-2.5">
          <Link href={pos.backHref} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-secondary hover:bg-primary_hover hover:text-primary">
            <ArrowLeft className="size-4" /> Тойм
          </Link>
          <span className="label-mono flex-1 text-center text-tertiary">
            {pos.n}/{pos.total}
          </span>
          {pos.next ? (
            <Link
              href={`/article/${pos.next.slug}`}
              onClick={() => setRead(addIds(readRaw, [pos.next!.id]))}
              title={pos.next.headline}
              className="flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-bg-primary hover:opacity-90"
            >
              Дараагийнх <ArrowRight className="size-4" />
            </Link>
          ) : (
            <Link href={pos.backHref} className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-secondary hover:bg-primary_hover">
              ✓ Тойм дууслаа
            </Link>
          )}
          <button
            type="button"
            aria-label="Хаах"
            onClick={() => {
              clearTrail();
              setClosed(true);
            }}
            className="rounded-lg p-2 text-fg-quaternary hover:bg-primary_hover hover:text-secondary"
          >
            <XClose className="size-4" />
          </button>
        </div>
      </nav>
    </>
  );
}
