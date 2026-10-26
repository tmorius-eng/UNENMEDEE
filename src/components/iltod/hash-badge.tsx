"use client";

import { Check, Copy01, ShieldTick } from "@untitledui/icons";
import { useState } from "react";

/** SHA-256 of the cleaned original text: anyone can re-scrape the page and verify it. */
export function HashBadge({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(hash);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      title="SHA-256 хэшийг хуулах"
      className="group label-mono inline-flex max-w-full cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 normal-case text-secondary ring-1 ring-line transition ring-inset hover:bg-primary_hover"
    >
      <ShieldTick className="size-4 shrink-0 text-fg-brand-primary" />
      <span className="shrink-0 font-semibold uppercase">SHA-256</span>
      <span className="truncate">{hash}</span>
      {copied ? <Check className="size-4 shrink-0 text-fg-brand-primary" /> : <Copy01 className="size-4 shrink-0 text-fg-quaternary group-hover:text-fg-secondary" />}
    </button>
  );
}
