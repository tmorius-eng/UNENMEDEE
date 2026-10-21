"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A localStorage value as an external store (no setState-in-effect, no hydration mismatch:
 * the server snapshot is the fallback). Storage can be unavailable (private mode, blocked
 * site data), so every access is guarded and the fallback keeps the page usable.
 */
const listeners = new Map<string, Set<() => void>>();

function read(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function useLocalStorage(key: string, fallback: string): [string, (value: string) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      if (!listeners.has(key)) listeners.set(key, new Set());
      listeners.get(key)!.add(cb);
      const onStorage = (e: StorageEvent) => e.key === key && cb();
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.get(key)?.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    [key],
  );
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  const set = useCallback(
    (v: string) => {
      try {
        localStorage.setItem(key, v);
      } catch {
        /* unavailable: value is not kept */
      }
      listeners.get(key)?.forEach((l) => l());
    },
    [key],
  );
  return [value, set];
}
