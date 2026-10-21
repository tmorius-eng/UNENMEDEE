/** Reader-facing names for the AI services; the model id is shown as logged, so readers can check it. */
export const PROVIDER_NAMES: Record<string, string> = {
  deepseek: "DeepSeek",
  grok: "xAI Grok",
  gemini: "Google Gemini",
  nvidia: "NVIDIA NIM",
  groq: "Groq",
  requesty: "Requesty",
  ollama: "Ollama",
};

/** "Google Gemini · gemini-flash-lite-latest", "NVIDIA NIM · gemma-4-31b-it". */
export function aiModelLabel(ref: { provider: string; model: string }): string {
  const model = ref.model.replace(/^[\w.-]+\//, "");
  return `${PROVIDER_NAMES[ref.provider] ?? ref.provider} · ${model}`;
}
