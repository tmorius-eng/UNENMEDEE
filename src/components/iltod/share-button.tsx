"use client";

import { Check, Copy01, Share07 } from "@untitledui/icons";
import { useEffect, useRef, useState } from "react";

import { cx } from "@/utils/cx";

/**
 * Share a page. Phones get the system share sheet (Messenger, Facebook, Viber, ...) via the
 * Web Share API; elsewhere a small menu offers Facebook, X and copy-link. The absolute URL is
 * built at click time from the current origin, so server and client markup stay identical.
 */
export function ShareButton({ path, title, text, className, label = "Хуваалцах" }: { path: string; title: string; text?: string; className?: string; label?: string }) {
  const [menu, setMenu] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menu]);

  const share = async () => {
    const url = new URL(path, window.location.origin).toString();
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return; // the reader closed the sheet
      }
    }
    setMenu((cur) => (cur ? null : url));
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Холбоосыг хуулна уу:", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const item = "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-secondary hover:bg-primary_hover";
  return (
    <div ref={ref} className={cx("relative inline-flex", className)}>
      <button
        type="button"
        onClick={share}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-secondary ring-1 ring-primary ring-inset hover:bg-primary_hover"
      >
        <Share07 className="size-4" aria-hidden />
        {label}
      </button>
      {menu && (
        <div role="menu" className="absolute top-full left-0 z-30 mt-1 w-52 animate-in rounded-xl bg-primary p-1 shadow-lg ring-1 ring-secondary fade-in zoom-in-95">
          <a role="menuitem" className={item} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(menu)}`} target="_blank" rel="noreferrer" onClick={() => setMenu(null)}>
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-[#1877f2] text-xs font-bold text-white">f</span>
            Facebook
          </a>
          <a
            role="menuitem"
            className={item}
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(menu)}&text=${encodeURIComponent(title)}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMenu(null)}
          >
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-black text-xs font-bold text-white">𝕏</span>X (Twitter)
          </a>
          <button role="menuitem" type="button" className={item} onClick={() => copy(menu)}>
            {copied ? <Check className="size-5 text-success-primary" aria-hidden /> : <Copy01 className="size-5" aria-hidden />}
            {copied ? "Хуулагдлаа" : "Холбоос хуулах"}
          </button>
        </div>
      )}
    </div>
  );
}
