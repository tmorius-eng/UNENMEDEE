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
  // Gemini on a billed project (ai.google.dev/gemini-api/docs/pricing, Oct 2026). The billed
  // default model is the cheapest text model, gemini-2.5-flash-lite: $0.10 in / $0.40 out.
  // Other models are priced by geminiModelPrice. A key from a project WITHOUT billing is free:
  // set GEMINI_FREE_TIER=true. A billed key is charged for every call, so never assumed free.
  gemini: { input: 0.1, output: 0.4 },
  // NVIDIA NIM free API (build.nvidia.com). Free models are rate limited, not billed.
  nvidia: { input: 0, output: 0 },
  // Groq free tier (rate limited per minute/day, no card). Not to be confused with xAI Grok.
  groq: { input: 0, output: 0 },
  // Requesty gateway: the default model (google/gemma-4-31b-it) is free. The router logs the
  // cost Requesty itself reports, so a paid REQUESTY_MODEL is still logged exactly.
  requesty: { input: 0, output: 0 },
  ollama: { input: 0, output: 0 },
};

/** The cheapest Gemini text model: the only one used on a billed key unless GEMINI_MODEL says otherwise. */
export const GEMINI_BILLED_MODEL = "gemini-2.5-flash-lite";

/** List price of a Gemini text model (USD per 1M tokens), by its id or "-latest" alias. */
export function geminiModelPrice(model: string): { input: number; output: number } {
  const m = model.toLowerCase();
  if (m.includes("2.5-flash-lite")) return { input: 0.1, output: 0.4 };
  if (m.includes("3.1-flash-lite")) return { input: 0.25, output: 1.5 };
  if (m.includes("lite")) return { input: 0.3, output: 2.5 }; // 3.5 Flash-Lite, "flash-lite-latest"
  if (m.includes("2.5-flash")) return { input: 0.3, output: 2.5 };
  return { input: 0.75, output: 3.75 }; // 3.x Flash, "flash-latest" (until 2026-12-31)
}

/**
 * Image, video and speech models are never used: they are billed per image or second and the
 * site only needs text. A configured one is refused instead of quietly spending money.
 */
export function isTextModel(model: string): boolean {
  return !/image|imagen|veo|tts|audio|live|banana/i.test(model);
}

/** True only when the Gemini key comes from a Google project without billing (free tier). */
export function geminiIsFree(env: Record<string, string | undefined> = process.env): boolean {
  return env.GEMINI_FREE_TIER?.trim().toLowerCase() === "true";
}

function envNumber(name: string): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function getPrice(provider: AIProvider, model?: string): { input: number; output: number } {
  if (provider === "gemini" && geminiIsFree()) return { input: 0, output: 0 };
  const base = provider === "gemini" && model ? geminiModelPrice(model) : DEFAULT_PRICES[provider];
  if (provider === "ollama") return base;
  const prefix = provider.toUpperCase();
  return {
    input: envNumber(`${prefix}_PRICE_IN`) ?? base.input,
    output: envNumber(`${prefix}_PRICE_OUT`) ?? base.output,
  };
}

/** Cost in USD, rounded to 6 decimals to match the numeric(10,6) column. */
export function estimateCostUsd(provider: AIProvider, promptTokens: number, completionTokens: number, model?: string): number {
  const p = getPrice(provider, model);
  const cost = (promptTokens * p.input + completionTokens * p.output) / 1_000_000;
  return Math.round(cost * 1e6) / 1e6;
}
