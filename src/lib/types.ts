/** Shared domain types used by the DB schema, AI pipeline and UI. */

/** portal = national data portals, local = aimag / district / city governments and councils. */
export type SourceCategory = "portal" | "ministry" | "agency" | "local";
export type AIProvider = "deepseek" | "grok" | "gemini" | "nvidia" | "groq" | "requesty" | "ollama";

/** Fact-vs-spin breakdown produced by the Tier-1 analyzer. */
export interface FactVsSpin {
  facts: string[];
  spin_detected: string;
  /** 0 = pure PR spin, 100 = fully neutral/factual. */
  neutrality_score: number;
}

/** Named entities extracted by the Tier-1 analyzer. */
export interface ExtractedEntities {
  people: string[];
  orgs: string[];
  /** Human-readable MNT amounts, e.g. "4.5 тэрбум ₮". */
  amounts_mnt: string[];
}

/** Structured fields a scraper adapter may attach (e.g. tender metadata). */
export interface ScrapeMeta {
  tender_code?: string;
  budget_mnt?: string;
  procuring_entity?: string;
  dataset_org?: string;
  dataset_updated?: string;
}

export const RISK_FLAG_THRESHOLD = 65;
