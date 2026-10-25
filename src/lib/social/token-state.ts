import { createHash } from "node:crypto";

/**
 * A refreshable 60-day token (Threads, Instagram) kept in app_settings. The GitHub secret only
 * seeds it: the pipeline refreshes the stored copy weekly, and a new secret value (a different
 * sha256 `seed`) replaces the stored state.
 */
export interface TokenState {
  token: string;
  refreshedAt: string;
  seed: string;
}

/** Refresh well before the 60-day expiry (a token must be 24 h old to be refreshed). */
export const REFRESH_AFTER_DAYS = 7;

export function seedOf(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Which token to use: a new secret wins over the stored state, else the state. No secret = the
 * platform is off: deleting the secret must stop posting, not leave a stored token refreshed forever.
 */
export function currentState(stored: TokenState | null, envToken: string | undefined, now = new Date()): TokenState | null {
  const env = envToken?.trim();
  if (!env) return null;
  if (!stored || stored.seed !== seedOf(env)) return { token: env, refreshedAt: now.toISOString(), seed: seedOf(env) };
  return stored;
}

export function needsRefresh(state: TokenState, now = new Date()): boolean {
  return now.getTime() - new Date(state.refreshedAt).getTime() > REFRESH_AFTER_DAYS * 86_400_000;
}
