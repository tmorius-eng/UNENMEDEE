/**
 * Small in-memory limits for public server actions. They live per server instance (Vercel may
 * run several), so they slow abuse down rather than guarantee a global cap.
 */

/** The caller's IP as Vercel reports it. */
export function clientIp(h: Headers): string {
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** Counts failures per key; after `max` failures inside `windowMs` the key is blocked until the window ends. */
export function failureLimiter(max: number, windowMs: number) {
  const entries = new Map<string, { count: number; resetAt: number }>();
  const live = (key: string, now: number) => {
    const e = entries.get(key);
    if (e && now >= e.resetAt) entries.delete(key);
    return entries.get(key);
  };
  return {
    blocked(key: string, now = Date.now()): boolean {
      return (live(key, now)?.count ?? 0) >= max;
    },
    fail(key: string, now = Date.now()): void {
      const e = live(key, now);
      if (e) e.count++;
      else entries.set(key, { count: 1, resetAt: now + windowMs });
      // Keep memory bounded if many IPs fail once.
      if (entries.size > 10_000) entries.delete(entries.keys().next().value!);
    },
    clear(key: string): void {
      entries.delete(key);
    },
  };
}
