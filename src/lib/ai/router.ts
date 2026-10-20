import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { z } from "zod";

import type { AIProvider } from "@/lib/types";

import { estimateCostUsd } from "./pricing";
import { parseJsonLoose } from "./schemas";

export type Tier = "tier1" | "tier2";
export type Purpose = "tier1" | "tier2" | "cluster" | "admin";

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

interface ProviderConfig {
  provider: AIProvider;
  model: string;
  client: OpenAI;
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
}

const clients = new Map<string, OpenAI>();

function client(baseURL: string, apiKey: string): OpenAI {
  const key = `${baseURL}|${apiKey.slice(-6)}`;
  let c = clients.get(key);
  if (!c) {
    c = new OpenAI({ baseURL, apiKey, timeout: 120_000, maxRetries: 2 });
    clients.set(key, c);
  }
  return c;
}

/** Providers that are configured in this environment (keys present). */
export function configuredProvider(provider: AIProvider): ProviderConfig | null {
  const env = process.env;
  switch (provider) {
    case "deepseek":
      return env.DEEPSEEK_API_KEY
        ? {
            provider,
            model: env.DEEPSEEK_MODEL || "deepseek-chat",
            client: client(env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1", env.DEEPSEEK_API_KEY),
          }
        : null;
    case "grok":
      return env.GROK_API_KEY
        ? { provider, model: env.GROK_MODEL || "grok-4-fast", client: client(env.GROK_BASE_URL || "https://api.x.ai/v1", env.GROK_API_KEY) }
        : null;
    case "ollama":
      // Only when explicitly configured (dev machines). CI has no local Ollama.
      return env.OLLAMA_BASE_URL
        ? { provider, model: env.OLLAMA_MODEL || "qwen3.5:4b", client: client(env.OLLAMA_BASE_URL, "ollama") }
        : null;
  }
}

/** Fallback order per tier (CLAUDE.md: DeepSeek bulk, Grok deep, Ollama zero-cost fallback). */
export const CHAINS: Record<Tier, AIProvider[]> = {
  tier1: ["deepseek", "ollama"],
  tier2: ["grok", "deepseek", "ollama"],
};

export interface CallOptions<S extends z.ZodTypeAny> {
  tier: Tier;
  purpose: Purpose;
  messages: ChatCompletionMessageParam[];
  schema: S;
  articleId?: number | null;
  maxTokens?: number;
  temperature?: number;
  log?: UsageLogger;
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

/**
 * Calls the tier's provider chain until one returns JSON that passes the schema.
 * Each provider gets one repair retry for invalid JSON. Every request, successful or not,
 * is logged with its exact token usage and USD cost.
 */
export async function callAIWithFallback<S extends z.ZodTypeAny>(opts: CallOptions<S>): Promise<CallResult<z.output<S>>> {
  const log = opts.log ?? noopLogger;
  const chain = (opts.chain ?? CHAINS[opts.tier]).map(configuredProvider).filter((p): p is ProviderConfig => p !== null);
  if (chain.length === 0) {
    throw new AIUnavailableError(
      `No AI provider configured for ${opts.tier}. Set DEEPSEEK_API_KEY${opts.tier === "tier2" ? " or GROK_API_KEY" : ""} (or OLLAMA_BASE_URL for local runs).`,
      [],
    );
  }

  const attempts: string[] = [];
  for (const p of chain) {
    let messages = opts.messages;
    for (let attempt = 0; attempt < 2; attempt++) {
      let promptTokens = 0;
      let completionTokens = 0;
      try {
        const res = await p.client.chat.completions.create({
          model: p.model,
          messages,
          response_format: { type: "json_object" },
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens ?? 1_500,
        });
        promptTokens = res.usage?.prompt_tokens ?? 0;
        completionTokens = res.usage?.completion_tokens ?? 0;
        const content = res.choices[0]?.message?.content ?? "";
        const parsed = opts.schema.safeParse(parseJsonLoose(content));
        if (!parsed.success) throw new SchemaError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "), content);
        const costUsd = estimateCostUsd(p.provider, promptTokens, completionTokens);
        await log({ provider: p.provider, model: p.model, purpose: opts.purpose, articleId: opts.articleId, promptTokens, completionTokens, estimatedCostUsd: costUsd, success: true });
        return { data: parsed.data, provider: p.provider, model: p.model, costUsd };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        attempts.push(`${p.provider}/${p.model}: ${message.slice(0, 200)}`);
        if (promptTokens || completionTokens) {
          await log({
            provider: p.provider,
            model: p.model,
            purpose: opts.purpose,
            articleId: opts.articleId,
            promptTokens,
            completionTokens,
            estimatedCostUsd: estimateCostUsd(p.provider, promptTokens, completionTokens),
            success: false,
          });
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
        break; // network / auth / rate limit: next provider
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
