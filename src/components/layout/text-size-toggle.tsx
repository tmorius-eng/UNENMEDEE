"use client";

import { Type01 } from "@untitledui/icons";
import { useEffect } from "react";

import { useLocalStorage } from "@/lib/local-store";

const SIZES = ["md", "lg", "xl"] as const;
type Size = (typeof SIZES)[number];
const LABEL: Record<Size, string> = { md: "Дунд", lg: "Том", xl: "Маш том" };

/** Kagi's "Tт": cycles the reading size (all rem-based text scales). Stored per browser. */
export function TextSizeToggle() {
  const [raw, setRaw] = useLocalStorage("iltod-text-size", "md");
  const size: Size = (SIZES as readonly string[]).includes(raw) ? (raw as Size) : "md";

  // Sync the <html> attribute the CSS reads (globals.css: html[data-text-size]).
  useEffect(() => {
    document.documentElement.dataset.textSize = size;
  }, [size]);

  return (
    <button
      type="button"
      onClick={() => setRaw(SIZES[(SIZES.indexOf(size) + 1) % SIZES.length])}
      aria-label={`Үсгийн хэмжээ: ${LABEL[size]}`}
      title={`Үсгийн хэмжээ: ${LABEL[size]}`}
      className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-fg-quaternary transition hover:bg-primary_hover hover:text-fg-secondary"
    >
      <Type01 className="size-5" />
    </button>
  );
}
