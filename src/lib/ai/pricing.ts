import type { AIProvider } from "@/lib/types";

/**
 * USD per 1M tokens. Defaults follow the project spec; verify current list prices at
 * https://api-docs.deepseek.com/quick_start/pricing and https://docs.x.ai/docs/models
 * and override with env vars (DEEPSEEK_PRICE_IN, DEEPSEEK_PRICE_OUT, GROK_PRICE_IN, GROK_PRICE_OUT).
 * Every logged cost is computed from this table, so the /transparency page stays exact.
 */
const DEFAULT_PRICES: Record<AIProvider, { input: number; output: number }> = {
  deepseek: { input: 0.15, output: 0.6 },
  grok: { input: 2, output: 6 },
  ollama: { input: 0, output: 0 },
};

function envNumber(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function getPrice(provider: AIProvider): { input: number; output: number } {
  const base = DEFAULT_PRICES[provider];
  if (provider === "ollama") return base;
  const prefix = provider.toUpperCase();
  return {
    input: envNumber(`${prefix}_PRICE_IN`) ?? base.input,
    output: envNumber(`${prefix}_PRICE_OUT`) ?? base.output,
  };
}

/** Cost in USD, rounded to 6 decimals to match the numeric(10,6) column. */
export function estimateCostUsd(provider: AIProvider, promptTokens: number, completionTokens: number): number {
  const p = getPrice(provider);
  const cost = (promptTokens * p.input + completionTokens * p.output) / 1_000_000;
  return Math.round(cost * 1e6) / 1e6;
}
