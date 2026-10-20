"use client";

import { Moon01, Sun } from "@untitledui/icons";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoid a hydration mismatch: the theme is only known on the client.
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const isDark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Цайвар горим" : "Харанхуй горим"}
      className="flex size-10 cursor-pointer items-center justify-center rounded-lg text-fg-quaternary transition hover:bg-primary_hover hover:text-fg-secondary"
    >
      {isDark ? <Sun className="size-5" /> : <Moon01 className="size-5" />}
    </button>
  );
}
