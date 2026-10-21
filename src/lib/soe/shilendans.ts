import { z } from "zod";

import { politeFetch } from "@/lib/scraper/http";

/**
 * State-owned companies (ТӨК) and state-owned enterprises (ТӨҮГ) as reported to Шилэн данс:
 * one open-data call returns every organisation's yearly performance report (form 2480).
 * Figures are self-reported and unaudited; D = actual for the year when month = 12.
 * The back-end answers 400 without the `address: warn` header its own site sends.
 */
export const SOE_URL = "https://back.shilendans.gov.mn/proxy/gap-report-service/reportFormDatas/openData1";
export const SOE_SOURCE_URL = "https://shilendans.gov.mn/";

const LINES = {
  2: "revenue",
  3: "expenses",
  4: "wageFund",
  6: "profit",
  7: "netProfit",
  8: "dividend",
  9: "investment",
  10: "debt",
  11: "receivables",
  12: "staff",
} as const;
type Metric = (typeof LINES)[keyof typeof LINES];

/** Numbers and ids arrive as strings or numbers; null must stay null (z.coerce would make "null"). */
const str = z.union([z.string(), z.number()]).nullish().transform((v) => (v === null || v === undefined || v === "" ? null : String(v)));
const num = z.union([z.string(), z.number()]).nullish().transform((v) => (v === null || v === undefined || v === "" ? null : Number(v)));

const Row = z.object({
  name: z.string(),
  line: z.coerce.number(),
  D: num,
  registerNo: str,
  certificateNo: str,
  refOrgTypeCode: str,
  refTypeName: z.string().nullish(),
  refCityName: z.string().nullish(),
});

export interface SoeCompany extends Partial<Record<Metric, number>> {
  name: string;
  registerNo: string | null;
  /** "company" = ТӨК (хувьцаат/ХХК), "enterprise" = ТӨҮГ */
  kind: "company" | "enterprise";
  /** Ministry or office that governs it ("Зам, тээврийн хөгжлийн сайд") */
  governor: string | null;
  city: string | null;
}

export interface SoeSnapshot {
  year: number;
  companies: SoeCompany[];
}

export function parseSoeReport(json: unknown): SoeCompany[] {
  const byKey = new Map<string, SoeCompany>();
  for (const raw of z.array(z.unknown()).parse(json)) {
    const r = Row.safeParse(raw);
    if (!r.success) continue;
    const metric = LINES[r.data.line as keyof typeof LINES];
    const name = r.data.name.replace(/\s+/g, " ").trim();
    const key = r.data.registerNo || r.data.certificateNo || name;
    const c = byKey.get(key) ?? {
      name,
      registerNo: r.data.registerNo || null,
      kind: r.data.refOrgTypeCode === "1" ? "company" : "enterprise",
      governor: r.data.refTypeName?.trim() || null,
      city: r.data.refCityName?.trim() || null,
    };
    if (metric && typeof r.data.D === "number" && Number.isFinite(r.data.D)) c[metric] = Math.round(r.data.D);
    byKey.set(key, c);
  }
  return [...byKey.values()].filter((c) => (c.revenue ?? 0) > 0 || (c.expenses ?? 0) > 0);
}

async function fetchYear(year: number): Promise<SoeCompany[]> {
  const res = await politeFetch(SOE_URL, {
    method: "POST",
    timeoutMs: 120_000,
    headers: { "content-type": "application/json", accept: "application/json", address: "warn" },
    body: JSON.stringify({ reportFormId: 2480, columns: [6705, 6709, 6713, 6717], years: [year], months: [12], reportGroupIds: [5], tez: [], ttz: [], orgs: [] }),
  });
  if (!res.ok) throw new Error(`shilendans openData1 returned HTTP ${res.status}`);
  return parseSoeReport(await res.json());
}

/** The latest full year with a meaningful number of reports (filings arrive late). */
export async function fetchSoeSnapshot(now = new Date()): Promise<SoeSnapshot> {
  for (let year = now.getUTCFullYear() - 1; year >= now.getUTCFullYear() - 3; year--) {
    const companies = await fetchYear(year);
    if (companies.length >= 100) return { year, companies };
  }
  throw new Error("no year with at least 100 SOE reports");
}
