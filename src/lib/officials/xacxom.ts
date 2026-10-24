import { z } from "zod";

import { politeFetch } from "@/lib/scraper/http";

/**
 * IAAC's ХАСХОМ system (xacxom.iaac.mn): public summaries of officials' asset and income
 * declarations for the last 5 years (Anti-Corruption Law, art. 14.3). The JSON API is the one
 * the site itself calls; amounts are in thousand ₮ and are converted to ₮ here.
 */
export const xacxomApiUrl = (id: string) => `https://xacxom.iaac.mn/api/public/xacxom/${encodeURIComponent(id)}`;
export const xacxomPageUrl = (id: string) => `https://xacxom.iaac.mn/xacxom/${encodeURIComponent(id)}`;

const amount = z.unknown().transform((v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
});
const text = z.unknown().transform((v) => (typeof v === "string" && v.trim() ? v.trim() : null));

const Row = z.object({
  year: z.coerce.number().int(),
  position_name: text,
  org_names: text,
  owner_total: amount,
  family_total: amount,
  total_construction_value: amount,
  transport_total_value: amount,
  land_total_value: amount,
  animal_total_value: amount,
  total_treasure_value: amount,
  savings_mon_total: amount,
  savings_other_total: amount,
  savings_cash: amount,
  receivable_total: amount,
  stock_total_value: amount,
  license_total_value: amount,
  virtual_value: amount,
  loan_total_value: amount,
  loan_total_balance: amount,
  gift_total_value: amount,
  transports: text,
  lands: text,
  lenders: text,
  stock_owner_name: text,
  virtuals: text,
  gift_type: text,
});

const Response = z.object({ retdata: z.array(z.unknown()).catch([]) });

export interface Declaration {
  year: number;
  positionName: string | null;
  incomeOwn: number | null;
  incomeFamily: number | null;
  buildingsValue: number | null;
  transportValue: number | null;
  landValue: number | null;
  savings: number | null;
  receivables: number | null;
  otherAssets: number | null;
  loans: number | null;
  gifts: number | null;
  /** Null when the filing lists no asset line at all (an empty filing is not "0 ₮"). */
  totalAssets: number | null;
  details: Record<string, string>;
}

/** thousand ₮ → ₮, rounded. */
const toMnt = (v: number | null) => (v === null ? null : Math.round(v * 1000));
const sum = (...xs: (number | null)[]) => xs.reduce<number>((a, b) => a + (b ?? 0), 0);

export function parseDeclarations(json: unknown): Declaration[] {
  const rows = Response.parse(json)
    .retdata.map((r) => Row.safeParse(r))
    .filter((r) => r.success)
    .map((r) => r.data);
  const byYear = new Map<number, Declaration>();
  for (const r of rows) {
    const savings = sum(r.savings_mon_total, r.savings_other_total, r.savings_cash);
    const other = sum(r.animal_total_value, r.total_treasure_value, r.stock_total_value, r.license_total_value, r.virtual_value);
    const assets = sum(r.total_construction_value, r.transport_total_value, r.land_total_value, savings, r.receivable_total, other);
    const filed = [r.total_construction_value, r.transport_total_value, r.land_total_value, r.savings_mon_total, r.savings_other_total, r.savings_cash, r.receivable_total, r.animal_total_value, r.total_treasure_value, r.stock_total_value, r.license_total_value, r.virtual_value].some((v) => v !== null && v !== undefined);
    const details = Object.fromEntries(
      Object.entries({ transports: r.transports, lands: r.lands, lenders: r.lenders, stocks: r.stock_owner_name, virtuals: r.virtuals, gifts: r.gift_type, organization: r.org_names }).filter(
        (e): e is [string, string] => e[1] !== null,
      ),
    );
    // A corrected filing ("Шинэчлэн гаргасан") for the same year replaces the earlier row.
    byYear.set(r.year, {
      year: r.year,
      positionName: r.position_name,
      incomeOwn: toMnt(r.owner_total),
      incomeFamily: toMnt(r.family_total),
      buildingsValue: toMnt(r.total_construction_value),
      transportValue: toMnt(r.transport_total_value),
      landValue: toMnt(r.land_total_value),
      savings: toMnt(savings),
      receivables: toMnt(r.receivable_total),
      otherAssets: toMnt(other),
      loans: toMnt(r.loan_total_balance ?? r.loan_total_value),
      gifts: toMnt(r.gift_total_value),
      totalAssets: filed ? toMnt(assets) : null,
      details,
    });
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year);
}

export async function fetchDeclarations(id: string): Promise<Declaration[]> {
  const res = await politeFetch(xacxomApiUrl(id), { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`xacxom ${id} returned HTTP ${res.status}`);
  return parseDeclarations(await res.json());
}

const SearchResponse = z.object({
  retdata: z
    .array(z.object({ aid_user_num: z.coerce.string(), first_name: z.string().nullish(), last_name: z.string().nullish(), position_name: z.string().nullish() }))
    .catch([]),
});

/** Fallback when parliament.mn has no hom_url: find the MP's declaration id by name. */
export async function searchXacxomId(lastName: string, firstName: string): Promise<string | null> {
  const res = await politeFetch("https://xacxom.iaac.mn/api/public/xacxom/search", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ lastname: lastName, firstname: firstName, positionName: "Улсын Их Хурлын гишүүн" }),
  });
  if (!res.ok) return null;
  const parsed = SearchResponse.safeParse(await res.json());
  if (!parsed.success) return null;
  const hits = parsed.data.retdata.filter((r) => r.first_name?.trim() === firstName && r.last_name?.trim() === lastName);
  return hits.length === 1 ? hits[0].aid_user_num : null; // ambiguous names stay unlinked
}
