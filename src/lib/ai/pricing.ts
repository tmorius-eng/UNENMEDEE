import type { AIProvider } from "@/lib/types";

/**
 * USD per 1M tokens. Defaults follow the project spec; verify current list prices at
 * https://api-docs.deepseek.com/quick_start/pricing and https://docs.x.ai/docs/models
 * and override with env vars (DEEPSEEK_PRICE_IN/OUT, GROK_PRICE_IN/OUT, GEMINI_PRICE_IN/OUT, NVIDIA_PRICE_IN/OUT, GROQ_PRICE_IN/OUT, REQUESTY_PRICE_IN/OUT).
 * Requesty reports the exact billed cost per call; when present, the router logs that instead.
 * Every logged cost is computed from this table, so the /transparency page stays exact.
 */
const DEFAULT_PRICES: Record<AIProvider, { input: number; output: number }> = {
  deepseek: { input: 0.15, output: 0.6 },
  grok: { input: 2, output: 6 },
  // Google AI Studio free tier. If you enable billing, set GEMINI_PRICE_IN / GEMINI_PRICE_OUT.
  gemini: { input: 0, output: 0 },
  // NVIDIA NIM free API (build.nvidia.com). Free models are rate limited, not billed.
  nvidia: { input: 0, output: 0 },
  // Groq free tier (rate limited per minute/day, no card). Not to be confused with xAI Grok.
  groq: { input: 0, output: 0 },
  // Requesty gateway: the default model (google/gemma-4-31b-it) is free. The router logs the
  // cost Requesty itself reports, so a paid REQUESTY_MODEL is still logged exactly.
  requesty: { input: 0, output: 0 },
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
