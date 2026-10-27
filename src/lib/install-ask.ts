/**
 * When the phone install strip may ask again (pure, unit-tested; read by `InstallBanner`).
 *
 * - Installed = never ask. Android Chrome knows it: once the app is installed it stops firing
 *   `beforeinstallprompt`, so the strip is not even eligible there. iPhone Safari cannot see a
 *   home-screen install, so the reader tells us ("Нэмчихсэн ✓" in the steps sheet).
 * - A ✕, an ignored strip or a cancelled Android prompt: ask again after 5 minutes (owner's choice).
 * - An iPhone reader who opened the steps has probably added it: ask again only after a day.
 */

export const DISMISS_KEY = "iltod-install-dismissed-at";
export const STEPS_KEY = "iltod-install-steps-at";
export const INSTALLED_KEY = "iltod-app-installed";

export const REASK_MS = 5 * 60_000;
export const STEPS_REASK_MS = 24 * 3_600_000;
export const FIRST_DELAY_MS = 4_000;

export interface AskState {
  dismissedAt: number;
  stepsAt: number;
  installed: boolean;
}

const num = (raw: string | null) => {
  const n = Number(raw ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function parseAskState(get: (key: string) => string | null): AskState {
  return { dismissedAt: num(get(DISMISS_KEY)), stepsAt: num(get(STEPS_KEY)), installed: get(INSTALLED_KEY) === "1" };
}

/** Milliseconds until the strip may show (at least the first-load delay), or null = never. */
export function askDelay(state: AskState, now: number): number | null {
  if (state.installed) return null;
  const until = Math.max(state.dismissedAt + REASK_MS, state.stepsAt ? state.stepsAt + STEPS_REASK_MS : 0);
  return Math.max(FIRST_DELAY_MS, until - now);
}
