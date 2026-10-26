"use client";

import { Moon01, Sun } from "@untitledui/icons";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { HEADER_ICON_BUTTON } from "./header-styles";

const subscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoid a hydration mismatch: the theme is only known on the client.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";
  return (
    <button type="button" onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={isDark ? "Цайвар горим" : "Харанхуй горим"} className={HEADER_ICON_BUTTON}>
      {isDark ? <Sun className="size-[18px]" /> : <Moon01 className="size-[18px]" />}
    </button>
  );
}
