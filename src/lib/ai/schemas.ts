import { z } from "zod";

import { RISK_FLAG_THRESHOLD } from "@/lib/types";

/** LLMs sometimes return numbers as strings or out of range: coerce and clamp. */
const score = z.coerce
  .number()
  .catch(0)
  .transform((n) => Math.max(0, Math.min(100, Math.round(n))));

const stringList = (max: number) =>
  z
    .array(z.coerce.string())
    .catch([])
    .transform((xs) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))].slice(0, max));

export const Tier1Schema = z
  .object({
    tldr_summary: z.union([z.string(), z.array(z.string())]).transform((v) => (Array.isArray(v) ? v.join("\n") : v).trim()),
    facts: stringList(12),
    spin_detected: z.coerce.string().catch(""),
    neutrality_score: score,
    entities: z
      .object({
        people: stringList(20),
        orgs: stringList(20),
        amounts_mnt: stringList(15),
      })
      .catch({ people: [], orgs: [], amounts_mnt: [] }),
    risk_score: score,
    risk_reason: z.coerce.string().catch(""),
    risk_flag: z.unknown().optional(),
  })
  // risk_flag is derived deterministically, never trusted from the model.
  .transform((v) => ({ ...v, risk_flag: v.risk_score >= RISK_FLAG_THRESHOLD }))
  .refine((v) => v.tldr_summary.length >= 20, { message: "tldr_summary is empty" });

export type Tier1Result = z.output<typeof Tier1Schema>;

export const Tier2Schema = z.object({
  analysis_markdown: z.string().min(80),
  citizen_questions: stringList(8),
});

export type Tier2Result = z.output<typeof Tier2Schema>;

export const ClusterSchema = z.object({
  title: z.string().min(5).max(200),
  synthesis: z.string().min(40),
});

export type ClusterResult = z.output<typeof ClusterSchema>;

/** Extracts the first JSON object from a model reply (handles ```json fences and chatter). */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error("Model reply contained no JSON object");
  }
}
