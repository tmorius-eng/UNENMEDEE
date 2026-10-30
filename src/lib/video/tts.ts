/**
 * Video narration with Gemini's speech model (the only speech model the project calls; the text
 * router still refuses them, `isTextModel`). The whole narration goes in one call with a short
 * director's note, which sounds like a person talking; sentence by sentence and sped up sounded
 * robotic (Oct 2026 samples). Voice "Aoede" was the owner's pick. Every call passes the budget
 * guard first and is logged with its cost to ai_usage_logs (CLAUDE.md rule #4).
 */
import type { BudgetGuard } from "@/lib/ai/limits";
import { estimateCostUsd } from "@/lib/ai/pricing";
import type { UsageLogger } from "@/lib/ai/router";

export const TTS_MODEL = process.env.GEMINI_TTS_MODEL?.trim() || "gemini-3.8-flash-tts";
export const TTS_VOICE = process.env.GEMINI_TTS_VOICE?.trim() || "Aoede";

/** The director's note: who speaks, where, how. Only the TRANSCRIPT is read aloud. */
export function narrationPrompt(text: string): string {
  return `# AUDIO PROFILE: A woman in her late twenties, a native Mongolian speaker from Ulaanbaatar who hosts a popular short video channel that explains the news to young people.
## THE SCENE: Recording a 25-second vertical video for Instagram Reels in a quiet home studio, talking straight to one viewer like a friend over tea.
### DIRECTOR'S NOTES
Style: warm, relaxed and genuinely conversational, with a light smile in the voice. Real human pauses at commas and full stops. A little curious lift on the questions, gentle emphasis on the numbers. Never a news anchor, never sing-song.
Pacing: natural everyday speaking pace.
Accent: native Khalkha Mongolian.
#### TRANSCRIPT
${text}`;
}

/** A WAV container around raw 16-bit mono PCM (the API may answer either). */
export function pcmToWav(pcm: Buffer, sampleRate = 24_000): Buffer {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export class SpeechError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpeechError";
  }
}

/** Speaks `text` and returns a WAV file. Throws when the guard says no or the answer has no audio. */
export async function speak(opts: {
  text: string;
  apiKey: string;
  guard: BudgetGuard;
  log: UsageLogger;
  model?: string;
  voice?: string;
  fetchImpl?: typeof fetch;
}): Promise<Buffer> {
  const model = opts.model ?? TTS_MODEL;
  const allowed = await opts.guard.check("gemini");
  if (!allowed.ok) throw new SpeechError(`narration skipped: ${allowed.reason}`);
  const res = await (opts.fetchImpl ?? fetch)(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(opts.apiKey ? { "x-goog-api-key": opts.apiKey } : {}) },
    body: JSON.stringify({
      contents: [{ parts: [{ text: narrationPrompt(opts.text) }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: opts.voice ?? TTS_VOICE } } } },
    }),
    signal: AbortSignal.timeout(180_000),
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const promptTokens = body.usageMetadata?.promptTokenCount ?? 0;
  const audioTokens = body.usageMetadata?.candidatesTokenCount ?? 0;
  const cost = estimateCostUsd("gemini", promptTokens, audioTokens, model);
  const audio = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  if (promptTokens || audioTokens) {
    await opts.log({ provider: "gemini", model, purpose: "video", promptTokens, completionTokens: audioTokens, estimatedCostUsd: cost, success: res.ok && !!audio });
    opts.guard.record("gemini", cost);
  }
  if (!res.ok) throw new SpeechError(`Gemini speech ${res.status}: ${(body.error?.message ?? res.statusText).slice(0, 200)}`);
  if (!audio?.data) throw new SpeechError("Gemini speech answered without audio");
  const raw = Buffer.from(audio.data, "base64");
  if (raw.subarray(0, 4).toString("latin1") === "RIFF") return raw;
  const rate = Number(/rate=(\d+)/.exec(audio.mimeType ?? "")?.[1] ?? 24_000);
  return pcmToWav(raw, rate);
}
