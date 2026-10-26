"use client";

import { Type01 } from "@untitledui/icons";
import { useEffect } from "react";

import { useLocalStorage } from "@/lib/local-store";

import { HEADER_ICON_BUTTON } from "./header-styles";

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
      className={HEADER_ICON_BUTTON}
    >
      <Type01 className="size-[18px]" />
    </button>
  );
}
