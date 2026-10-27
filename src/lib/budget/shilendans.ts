import { z } from "zod";

import { politeFetch } from "@/lib/scraper/http";

/**
 * Шилэн данс (shilendans.gov.mn) back-end used by its own React site: payments from state
 * budget accounts. robots.txt allows everything. Amounts in ₮.
 */
const BASE = "https://back.shilendans.gov.mn/proxy/gap-integration-service/integrationECopyCredits";
export const SHILENDANS_URL = "https://shilendans.gov.mn/";

const Payee = z.object({ registerNo: z.coerce.string().nullish(), name: z.string(), totalAmount: z.coerce.number() });
const Category = z.object({ code: z.coerce.string(), name: z.string(), amount: z.coerce.number(), percent: z.coerce.number().nullish() });

export interface ShilendansSnapshot {
  from: string;
  to: string;
  topPayees: { registerNo: string | null; name: string; amount: number }[];
  categories: { code: string; name: string; amount: number; percent: number | null }[];
}

export function parseTopPayees(json: unknown): ShilendansSnapshot["topPayees"] {
  return z
    .array(Payee)
    .parse(json)
    .map((p) => ({ registerNo: p.registerNo ?? null, name: p.name.trim(), amount: p.totalAmount }));
}

export function parseCategories(json: unknown): ShilendansSnapshot["categories"] {
  return z
    .array(Category)
    .parse(json)
    .filter((c) => c.amount > 0)
    .map((c) => ({ code: c.code, name: c.name.trim(), amount: c.amount, percent: c.percent ?? null }))
    .sort((a, b) => b.amount - a.amount);
}

async function get(path: string): Promise<unknown> {
  const res = await politeFetch(`${BASE}/${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`shilendans ${path.split("?")[0]} returned HTTP ${res.status}`);
  return res.json();
}

/**
 * The period to show: this calendar year so far (Ulaanbaatar date), except in January and
 * February, when a few weeks of payments made "the year's largest payees" near-empty and
 * misleading: then the whole previous year. The page prints the dates either way.
 */
export function shilendansPeriod(now = new Date()): { from: string; to: string } {
  const today = new Date(now.getTime() + 8 * 3_600_000).toISOString().slice(0, 10);
  const year = Number(today.slice(0, 4));
  if (today.slice(5) < "03-01") return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` };
  return { from: `${year}-01-01`, to: today };
}

/** Fewer payees than this is a broken or empty answer: the sync keeps the previous snapshot. */
export const MIN_PAYEES = 5;

export async function fetchShilendans(now = new Date()): Promise<ShilendansSnapshot> {
  const { from, to } = shilendansPeriod(now);
  const q = `dateStart=${from}&dateEnd=${to}&type=1`;
  const topPayees = parseTopPayees(await get(`getTopTen?${q}`));
  if (topPayees.length < MIN_PAYEES) throw new Error(`shilendans returned only ${topPayees.length} payee(s) for ${from}–${to}: keeping the previous snapshot`);
  return { from, to, topPayees, categories: parseCategories(await get(`getEZAListByDateBetween?${q}`)) };
}
