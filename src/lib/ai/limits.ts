import type { AIProvider } from "@/lib/types";

import { getPrice } from "./pricing";

/**
 * Spending and quota protection.
 *
 * - Paid providers (price > 0) stop being called once the monthly or daily USD budget is spent.
 * - Every provider can have a daily call cap (Grok defaults to 5/day, Gemini to its free quota).
 * - Free providers keep working after the money budget is reached, so the site never stops.
 * All limits are env vars, so they can be changed in GitHub/Vercel settings without code.
 */

export interface BudgetConfig {
  monthlyUsd: number;
  dailyUsd: number;
  dailyMaxCalls: Partial<Record<AIProvider, number>>;
  requestsPerMinute: Partial<Record<AIProvider, number>>;
}

type Env = Record<string, string | undefined>;

function num(env: Env, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function budgetConfig(env: Env = process.env): BudgetConfig {
  return {
    monthlyUsd: num(env, "AI_MONTHLY_BUDGET_USD", 3),
    dailyUsd: num(env, "AI_DAILY_BUDGET_USD", 0.3),
    dailyMaxCalls: {
      grok: num(env, "GROK_DAILY_MAX_CALLS", 5),
      deepseek: num(env, "DEEPSEEK_DAILY_MAX_CALLS", 500),
      gemini: num(env, "GEMINI_DAILY_MAX_CALLS", 800),
      nvidia: num(env, "NVIDIA_DAILY_MAX_CALLS", 1_000),
      groq: num(env, "GROQ_DAILY_MAX_CALLS", 900),
      requesty: num(env, "REQUESTY_DAILY_MAX_CALLS", 500),
      mistral: num(env, "MISTRAL_DAILY_MAX_CALLS", 2_000),
      // OpenRouter's free models allow 50 requests a day per account without a top-up.
      openrouter: num(env, "OPENROUTER_DAILY_MAX_CALLS", 45),
      zai: num(env, "ZAI_DAILY_MAX_CALLS", 900),
      ollama: num(env, "OLLAMA_DAILY_MAX_CALLS", 100_000),
    },
    requestsPerMinute: {
      // Gemini's free tier is limited per minute; stay under it instead of hitting 429s.
      gemini: num(env, "GEMINI_RPM", 10),
      nvidia: num(env, "NVIDIA_RPM", 30),
      groq: num(env, "GROQ_RPM", 25),
      requesty: num(env, "REQUESTY_RPM", 20),
      // Mistral's free plan allows about one request a second; OpenRouter's free models 20 a minute.
      mistral: num(env, "MISTRAL_RPM", 40),
      openrouter: num(env, "OPENROUTER_RPM", 15),
      zai: num(env, "ZAI_RPM", 20),
    },
  };
}

export interface UsageSnapshot {
  monthUsd: number;
  dayUsd: number;
  dayCalls: Partial<Record<AIProvider, number>>;
}

export type Allowance = { ok: true } | { ok: false; reason: string };

export function isPaid(provider: AIProvider): boolean {
  // Requesty is a prepaid credit account: its free models cost $0, but any other model
  // bills that account, so it always stays inside the USD budget.
  if (provider === "requesty") return true;
  const p = getPrice(provider);
  return p.input > 0 || p.output > 0;
}

/** Pure decision: may we call `provider` now? */
export function checkAllowance(provider: AIProvider, usage: UsageSnapshot, config: BudgetConfig): Allowance {
  const cap = config.dailyMaxCalls[provider];
  const calls = usage.dayCalls[provider] ?? 0;
  if (cap !== undefined && calls >= cap) return { ok: false, reason: `${provider}: daily call cap ${cap} reached` };
  if (isPaid(provider)) {
    if (usage.monthUsd >= config.monthlyUsd) return { ok: false, reason: `monthly AI budget $${config.monthlyUsd} reached` };
    if (usage.dayUsd >= config.dailyUsd) return { ok: false, reason: `daily AI budget $${config.dailyUsd} reached` };
  }
  return { ok: true };
}

export interface BudgetGuard {
  check(provider: AIProvider): Promise<Allowance>;
  /** Count a finished call (called by the router right after logging it). */
  record(provider: AIProvider, costUsd: number): void;
}

/**
 * Loads current spend once, then tracks new calls in memory (refreshing from the
 * source every minute). Concurrent workers may overshoot by at most one batch of calls.
 */
export function createBudgetGuard(load: () => Promise<UsageSnapshot>, config: BudgetConfig = budgetConfig()): BudgetGuard {
  let snapshot: UsageSnapshot | null = null;
  let loadedAt = 0;
  let pending: Promise<UsageSnapshot> | null = null;
  const current = async () => {
    if (!snapshot || Date.now() - loadedAt > 60_000) {
      pending ??= load().finally(() => (pending = null));
      snapshot = await pending;
      loadedAt = Date.now();
    }
    return snapshot;
  };
  return {
    async check(provider) {
      return checkAllowance(provider, await current(), config);
    },
    record(provider, costUsd) {
      if (!snapshot) return;
      snapshot.monthUsd += costUsd;
      snapshot.dayUsd += costUsd;
      snapshot.dayCalls[provider] = (snapshot.dayCalls[provider] ?? 0) + 1;
    },
  };
}

/** Guard that allows everything (tests, --sample runs). */
export const unlimitedGuard: BudgetGuard = { check: async () => ({ ok: true }), record: () => {} };

const nextSlot = new Map<AIProvider, number>();

/** Spaces requests to a provider so we stay under its requests-per-minute limit. */
export async function throttleProvider(provider: AIProvider, config: BudgetConfig = budgetConfig()): Promise<void> {
  const rpm = config.requestsPerMinute[provider];
  if (!rpm) return;
  const interval = 60_000 / rpm;
  const now = Date.now();
  const slot = Math.max(now, nextSlot.get(provider) ?? 0);
  nextSlot.set(provider, slot + interval);
  if (slot > now) await new Promise((r) => setTimeout(r, slot - now));
}
