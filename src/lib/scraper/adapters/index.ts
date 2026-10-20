import type { ScrapedItem } from "../types";
import { fetchOpendata } from "./opendata";
import { fetchParliament } from "./parliament";

/**
 * Sources that expose a public JSON API (the same one their own website calls).
 * These skip HTML crawling entirely: faster, exact dates, and no rendering needed.
 * Every other source goes through the generic crawler in ../crawl.ts.
 */
export const API_ADAPTERS: Record<string, (limit: number) => Promise<ScrapedItem[]>> = {
  "opendata.gov.mn": fetchOpendata,
  "parliament.mn": fetchParliament,
};
