import type { ScrapeMeta } from "@/lib/types";

/** One cleaned item ready to be stored as an article (no HTML). */
export interface ScrapedItem {
  url: string;
  title: string;
  text: string;
  publishedAt: Date | null;
  meta?: ScrapeMeta;
  /**
   * API adapters whose list has no body (legalinfo.mn) fetch the text lazily: the runner calls
   * this only for URLs not stored yet, so known items cost no request. Null = skip the item.
   * A detail page with a more exact date returns it too (police.gov.mn lists only the day).
   */
  loadText?: () => Promise<string | { text: string; publishedAt: Date | null } | null>;
}

export interface SourceRef {
  id: number;
  domain: string;
  name: string;
  urlPattern: string;
}

export interface SourceRunResult {
  sourceId: number;
  domain: string;
  found: number;
  inserted: number;
  skippedDuplicates: number;
  error: string | null;
  /** False when the run stopped (time budget) before this source's listing was processed. */
  completed: boolean;
}
