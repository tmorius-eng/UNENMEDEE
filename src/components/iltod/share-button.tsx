"use client";

import { Check, Copy01, Share07 } from "@untitledui/icons";
import { useEffect, useRef, useState } from "react";

import { cx } from "@/utils/cx";

/**
 * Share a page: a small menu with Facebook, Messenger (phones), Reddit r/mongolia, X and copy-link;
 * where the Web Share API exists its first item opens the system sheet. Instagram and Facebook
 * Stories have no web link to share to: "Story" shares a 1080×1920 image (/story-image) as a file
 * (the sheet then offers Instagram/Facebook Story) and copies the link for a Link sticker; desktops
 * download the image. The absolute URL is built at click time, so server and client markup match.
 */
export function ShareButton({ path, title, text, className, label = "Хуваалцах" }: { path: string; title: string; text?: string; className?: string; label?: string }) {
  const [menu, setMenu] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [native, setNative] = useState(false);
  const [phone, setPhone] = useState(false);
  const [story, setStory] = useState<"idle" | "busy" | "done">("idle");
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

  const toggle = () => {
    setNative(typeof navigator.share === "function");
    setPhone(window.matchMedia("(pointer: coarse)").matches);
    setMenu((cur) => (cur ? null : new URL(path, window.location.origin).toString()));
  };

  const shareNative = async (url: string) => {
    setMenu(null);
    try {
      await navigator.share({ title, text, url });
    } catch {
      // the reader closed the sheet
    }
  };

  const shareStory = async (url: string) => {
    setStory("busy");
    try {
      const res = await fetch(`/story-image?p=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error(String(res.status));
      const file = new File([await res.blob()], "iltodmedee-story.png", { type: "image/png" });
      await navigator.clipboard?.writeText(url).catch(() => {});
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }
      setStory("done");
      setTimeout(() => setStory("idle"), 4000);
    } catch {
      setStory("idle");
    }
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
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={menu !== null}
        className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-secondary ring-1 ring-line ring-inset transition hover:bg-primary_hover hover:text-primary"
      >
        <Share07 className="size-4" aria-hidden />
        {label}
      </button>
      {menu && (
        <div role="menu" className="absolute top-full left-0 z-30 mt-1 w-60 animate-in rounded-xl bg-primary p-1 shadow-lg ring-1 ring-line fade-in zoom-in-95">
          {native && (
            <button role="menuitem" type="button" className={item} onClick={() => shareNative(menu)}>
              <Share07 className="size-5" aria-hidden />
              Бусад апп (Viber, Telegram…)
            </button>
          )}
          <a role="menuitem" className={item} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(menu)}`} target="_blank" rel="noreferrer" onClick={() => setMenu(null)}>
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-[#1877f2] text-xs font-bold text-white">f</span>
            Facebook
          </a>
          {phone && (
            <a role="menuitem" className={item} href={`fb-messenger://share/?link=${encodeURIComponent(menu)}`} onClick={() => setMenu(null)}>
              <span aria-hidden className="grid size-5 place-items-center rounded-full bg-linear-to-br from-[#0a7cff] to-[#a033ff] text-[10px] font-bold text-white">m</span>
              Messenger
            </a>
          )}
          <button role="menuitem" type="button" className={item} onClick={() => shareStory(menu)} disabled={story === "busy"}>
            <span aria-hidden className="grid size-5 place-items-center rounded-md bg-linear-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-[10px] font-bold text-white">◎</span>
            {story === "busy" ? "Зураг бэлдэж байна…" : story === "done" ? "Холбоос хуулагдсан ✓ Link sticker-ээр наа" : phone ? "Instagram / Facebook Story" : "Story зураг татах"}
          </button>
          <a
            role="menuitem"
            className={item}
            href={`https://www.reddit.com/r/mongolia/submit?type=LINK&url=${encodeURIComponent(menu)}&title=${encodeURIComponent(title)}`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setMenu(null)}
          >
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-[#ff4500] text-[10px] font-bold text-white">r/</span>
            Reddit r/mongolia
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
