import OpenAI from "openai";
import type { z } from "zod";

import type { AIProvider } from "@/lib/types";

import { geminiGenerate, GeminiError, type ChatMessage } from "./gemini";
import { throttleProvider, unlimitedGuard, type BudgetGuard } from "./limits";
import { estimateCostUsd, getPrice } from "./pricing";
import { parseJsonLoose } from "./schemas";

export type Tier = "tier1" | "tier2";
export type Purpose = "tier1" | "tier2" | "cluster" | "admin" | "digest" | "topic";

export interface UsageRecord {
  provider: AIProvider;
  model: string;
  purpose: Purpose;
  articleId?: number | null;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  success: boolean;
}

/** Where usage records go. The default writes to `ai_usage_logs` (see usage-log.ts). */
export type UsageLogger = (record: UsageRecord) => Promise<void>;

interface CompletionArgs {
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
}

interface CompletionResult {
  content: string;
  promptTokens: number;
  completionTokens: number;
  /** Exact billed cost when the provider reports it (Requesty does). */
  costUsd?: number;
}

interface ProviderConfig {
  provider: AIProvider;
  model: string;
  complete(args: CompletionArgs): Promise<CompletionResult>;
}

/** Thrown when no provider in the chain is configured or all of them failed. */
export class AIUnavailableError extends Error {
  constructor(
    message: string,
    readonly attempts: string[],
  ) {
    super(message);
    this.name = "AIUnavailableError";
  }

  /** True when every provider was skipped because a spending/quota limit was reached. */
  get budgetExhausted(): boolean {
    return this.attempts.length > 0 && this.attempts.every((a) => a.includes("skipped (limit"));
  }
}

const clients = new Map<string, OpenAI>();

function openaiClient(baseURL: string, apiKey: string, timeoutMs: number): OpenAI {
  const key = `${baseURL}|${apiKey.slice(-6)}`;
  let c = clients.get(key);
  if (!c) {
    // The router owns retries (one repair, one 429 wait, then the next provider): with the SDK's
    // default of 2 a single attempt could mean three requests and three timeouts per provider.
    c = new OpenAI({ baseURL, apiKey, timeout: timeoutMs, maxRetries: 0 });
    clients.set(key, c);
  }
  return c;
}

interface OpenAIProviderOptions {
  timeoutMs?: number;
  /** Extra output tokens for models that reason before answering (reasoning shares the limit). */
  reasoningHeadroom?: number;
}

function openaiProvider(provider: AIProvider, model: string, baseURL: string, apiKey: string, opts: OpenAIProviderOptions = {}): ProviderConfig {
  const client = openaiClient(baseURL, apiKey, opts.timeoutMs ?? 120_000);
  return {
    provider,
    model,
    async complete({ messages, temperature, maxTokens }) {
      const res = await client.chat.completions.create({
        model,
        messages,
        response_format: { type: "json_object" },
        temperature,
        max_tokens: maxTokens + (opts.reasoningHeadroom ?? 0),
      });
      const reportedCost = (res.usage as { cost?: unknown } | undefined)?.cost;
      return {
        content: res.choices[0]?.message?.content ?? "",
        promptTokens: res.usage?.prompt_tokens ?? 0,
        completionTokens: res.usage?.completion_tokens ?? 0,
        costUsd: typeof reportedCost === "number" && Number.isFinite(reportedCost) && reportedCost >= 0 ? reportedCost : undefined,
      };
    },
  };
}

/** Providers that are configured in this environment (keys present). */
export function configuredProvider(provider: AIProvider, tier: Tier = "tier1"): ProviderConfig | null {
  const env = process.env;
  switch (provider) {
    case "deepseek":
      return env.DEEPSEEK_API_KEY
        ? openaiProvider(provider, env.DEEPSEEK_MODEL || "deepseek-chat", env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1", env.DEEPSEEK_API_KEY)
        : null;
    case "grok":
      return env.GROK_API_KEY ? openaiProvider(provider, env.GROK_MODEL || "grok-4-fast", env.GROK_BASE_URL || "https://api.x.ai/v1", env.GROK_API_KEY) : null;
    case "gemini": {
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) return null;
      // Bulk tier: Flash-Lite (no "thinking" by default: fast, generous free quota).
      // Deep tier: Flash, which reasons before answering; its thinking tokens share the
      // output limit, so it gets generous headroom (free tier: tokens cost nothing).
      const deep = tier === "tier2";
      const model = deep ? env.GEMINI_DEEP_MODEL || "gemini-flash-latest" : env.GEMINI_MODEL || "gemini-flash-lite-latest";
      return {
        provider,
        model,
        complete: ({ messages, temperature, maxTokens }) =>
          geminiGenerate({
            apiKey,
            model,
            messages,
            temperature,
            maxTokens: deep ? Math.max(maxTokens * 4, 8_192) : maxTokens,
          }),
      };
    }
    case "groq":
      // Groq free tier (OpenAI-compatible). Qwen 3.8 27B: valid JSON, good Mongolian, 2-3 s.
      return env.GROQ_API_KEY
        ? openaiProvider(provider, env.GROQ_MODEL || "qwen/qwen3.8-27b", env.GROQ_BASE_URL || "https://api.groq.com/openai/v1", env.GROQ_API_KEY)
        : null;
    case "nvidia":
      // NVIDIA NIM free API (OpenAI-compatible). Gemma 4 31B: valid JSON and good Mongolian
      // in tests, but slow on the free queue (15-40 s), hence the longer timeout.
      return env.NVIDIA_API_KEY
        ? openaiProvider(provider, env.NVIDIA_MODEL || "google/gemma-4-31b-it", env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1", env.NVIDIA_API_KEY, { timeoutMs: 180_000 })
        : null;
    case "requesty":
      // Requesty gateway (OpenAI-compatible). The default Gemma 4 31B is free there and
      // faster than on NVIDIA's queue (~7 s); it reasons first, hence the output headroom.
      return env.REQUESTY_API_KEY
        ? openaiProvider(provider, env.REQUESTY_MODEL || "google/gemma-4-31b-it", env.REQUESTY_BASE_URL || "https://router.requesty.ai/v1", env.REQUESTY_API_KEY, {
            timeoutMs: 150_000,
            reasoningHeadroom: 3_000,
          })
        : null;
    case "ollama":
      // Only when explicitly configured (dev machines). CI has no local Ollama.
      return env.OLLAMA_BASE_URL ? openaiProvider(provider, env.OLLAMA_MODEL || "qwen3.5:4b", env.OLLAMA_BASE_URL, "ollama") : null;
  }
}

const PROVIDERS: AIProvider[] = ["deepseek", "grok", "gemini", "nvidia", "groq", "requesty", "ollama"];

/**
 * Fallback order per tier. Free providers go first for bulk work (Groq: fastest, then Gemini,
 * then free Gemma on Requesty, then NVIDIA NIM); each has its own daily quota, so together
 * they cover far more articles than any one. Deep analysis: Grok (paid, capped), then Gemini Flash (free, reasons well).
 * Override with AI_TIER1_CHAIN / AI_TIER2_CHAIN, e.g. "deepseek,gemini" (comma separated).
 * Providers without an API key are skipped.
 */
export const DEFAULT_CHAINS: Record<Tier, AIProvider[]> = {
  tier1: ["groq", "gemini", "requesty", "nvidia", "deepseek", "ollama"],
  tier2: ["grok", "gemini", "groq", "requesty", "nvidia", "deepseek", "ollama"],
};

export function chainFor(tier: Tier, env: Record<string, string | undefined> = process.env): AIProvider[] {
  const raw = env[tier === "tier1" ? "AI_TIER1_CHAIN" : "AI_TIER2_CHAIN"];
  if (!raw?.trim()) return DEFAULT_CHAINS[tier];
  const parsed = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is AIProvider => (PROVIDERS as string[]).includes(s));
  return parsed.length ? [...new Set(parsed)] : DEFAULT_CHAINS[tier];
}

export interface CallOptions<S extends z.ZodTypeAny> {
  tier: Tier;
  purpose: Purpose;
  messages: ChatMessage[];
  schema: S;
  articleId?: number | null;
  maxTokens?: number;
  temperature?: number;
  log?: UsageLogger;
  /** Spending / quota guard. Defaults to unlimited (tests, --sample). */
  budget?: BudgetGuard;
  /** Override the provider chain (tests, admin "force Grok"). */
  chain?: AIProvider[];
}

export interface CallResult<T> {
  data: T;
  provider: AIProvider;
  model: string;
  costUsd: number;
}

const noopLogger: UsageLogger = async () => {};

function isRetryableRateLimit(err: unknown): boolean {
  return (err instanceof GeminiError && err.status === 429) || (err instanceof OpenAI.APIError && err.status === 429);
}

/**
 * Calls the tier's provider chain until one returns JSON that passes the schema.
 * Before each provider: budget/quota check, then requests-per-minute throttle.
 * Each provider gets one repair retry for invalid JSON. Every request with token usage,
 * successful or not, is logged with its USD cost and counted against the budget.
 */
export async function callAIWithFallback<S extends z.ZodTypeAny>(opts: CallOptions<S>): Promise<CallResult<z.output<S>>> {
  const log = opts.log ?? noopLogger;
  const budget = opts.budget ?? unlimitedGuard;
  const chain = (opts.chain ?? chainFor(opts.tier))
    .map((p) => configuredProvider(p, opts.tier))
    .filter((p): p is ProviderConfig => p !== null);
  if (chain.length === 0) {
    throw new AIUnavailableError(
      `No AI provider configured for ${opts.tier}. Set GROQ_API_KEY, GEMINI_API_KEY, REQUESTY_API_KEY or NVIDIA_API_KEY (free), or DEEPSEEK_API_KEY${opts.tier === "tier2" ? " / GROK_API_KEY" : ""} (or OLLAMA_BASE_URL for local runs).`,
      [],
    );
  }

  const attempts: string[] = [];
  for (const [index, p] of chain.entries()) {
    const allowance = await budget.check(p.provider);
    if (!allowance.ok) {
      attempts.push(`${p.provider}/${p.model}: skipped (limit: ${allowance.reason})`);
      continue;
    }
    let messages = opts.messages;
    for (let attempt = 0; attempt < 2; attempt++) {
      let promptTokens = 0;
      let completionTokens = 0;
      let reportedCost: number | undefined;
      try {
        await throttleProvider(p.provider);
        // The repair attempt gets more room: a reply cut off mid-JSON is the most common invalid one.
        const res = await p.complete({ messages, temperature: opts.temperature ?? 0.2, maxTokens: (opts.maxTokens ?? 1_500) * (attempt ? 2 : 1) });
        promptTokens = res.promptTokens;
        completionTokens = res.completionTokens;
        reportedCost = res.costUsd;
        const parsed = opts.schema.safeParse(parseJsonLoose(res.content));
        if (!parsed.success) throw new SchemaError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), res.content);
        const costUsd = reportedCost ?? estimateCostUsd(p.provider, promptTokens, completionTokens);
        await log({ provider: p.provider, model: p.model, purpose: opts.purpose, articleId: opts.articleId, promptTokens, completionTokens, estimatedCostUsd: costUsd, success: true });
        budget.record(p.provider, costUsd);
        return { data: parsed.data, provider: p.provider, model: p.model, costUsd };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        attempts.push(`${p.provider}/${p.model}: ${message.slice(0, 200)}`);
        if (promptTokens || completionTokens) {
          const costUsd = reportedCost ?? estimateCostUsd(p.provider, promptTokens, completionTokens);
          await log({ provider: p.provider, model: p.model, purpose: opts.purpose, articleId: opts.articleId, promptTokens, completionTokens, estimatedCostUsd: costUsd, success: false });
          budget.record(p.provider, costUsd);
        }
        if (err instanceof SchemaError || err instanceof SyntaxError || /no JSON object/.test(message)) {
          // One repair attempt on the same provider, then move on.
          messages = [
            ...opts.messages,
            { role: "assistant", content: err instanceof SchemaError ? err.reply.slice(0, 4_000) : "" },
            { role: "user", content: `Хариулт буруу байна (${message.slice(0, 200)}). Зөвхөн заасан бүтэцтэй, хүчинтэй JSON буцаа.` },
          ];
          continue;
        }
        if (isRetryableRateLimit(err) && attempt === 0) {
          // Free-tier per-minute quota. Another $0 provider next in line: switch now.
          // Only paid ones left: wait once and retry this free one instead of paying.
          if (chain.slice(index + 1).some((next) => getPrice(next.provider).input === 0 && getPrice(next.provider).output === 0)) break;
          await new Promise((r) => setTimeout(r, Number(process.env.AI_RATE_LIMIT_WAIT_MS ?? 20_000)));
          continue;
        }
        break; // network / auth / quota: next provider
      }
    }
  }
  throw new AIUnavailableError(`All AI providers failed for ${opts.tier}`, attempts);
}

class SchemaError extends Error {
  constructor(
    message: string,
    readonly reply: string,
  ) {
    super(`Invalid JSON shape: ${message}`);
    this.name = "SchemaError";
  }
}
