/**
 * True when a publish call failed in a way that says nothing about the post itself: a timeout or a
 * dropped connection. The platform may have published before the answer was lost, so the caller
 * must not try again (scripts/post-social.ts keeps the reservation for a manual check).
 */
export function outcomeUnknown(err: unknown): boolean {
  const e = err as { name?: string; cause?: { code?: string; name?: string } } | null;
  if (!e) return false;
  return e.name === "TimeoutError" || e.name === "AbortError" || /^(UND_ERR_|ECONNRESET|ETIMEDOUT|EPIPE)/.test(e.cause?.code ?? "") || e.cause?.name === "SocketError";
}
