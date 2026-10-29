import { politeFetch } from "@/lib/scraper/http";

import { type CompanyCheck, exactMatches, orgKey, parsePayers, parseSuppliers, PAYMENTS_FROM, searchQueries, SHILENDANS_API, type SupplierHit } from "./companies";

/** Network half of companies.ts (scripts only: pages import the pure half). */

const qs = (o: Record<string, string>) => new URLSearchParams(o).toString();

async function getJson(path: string): Promise<unknown> {
  const res = await politeFetch(`${SHILENDANS_API}/${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`shilendans ${path.split("?")[0]} returned HTTP ${res.status}`);
  return res.json();
}

/** Looks one declared company up in Шилэн данс (1–3 requests at the 8 s host pace). */
export async function checkCompany(name: string, to: string, now = new Date()): Promise<CompanyCheck> {
  const key = orgKey(name);
  const checkedAt = now.toISOString();
  let matches: SupplierHit[] = [];
  for (const q of searchQueries(name)) {
    const hits = parseSuppliers(await getJson(`getBeltgenNiiluulegch?${qs({ page: "0", size: "50", startDate: PAYMENTS_FROM, endDate: to, supplierType: "", ezaType: "", registerNo: "", orgName: q })}`));
    matches = exactMatches(hits, key);
    if (matches.length) break;
  }
  if (matches.length === 0) return { status: "none", name, checkedAt };
  if (matches.length > 1) return { status: "ambiguous", name, checkedAt, registers: matches.length };
  const [m] = matches;
  const payers = parsePayers(await getJson(`getSupplierOne?${qs({ page: "0", size: "25", startDate: PAYMENTS_FROM, endDate: to, registerNo: m.register })}`));
  return { status: "found", name: m.name, checkedAt, register: m.register, amount: m.amount, count: m.count, payers };
}
