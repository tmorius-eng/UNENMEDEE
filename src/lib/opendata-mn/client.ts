import { z } from "zod";

import { politeFetch } from "@/lib/scraper/http";

import type { Row } from "./highlights";

/**
 * opendata.mn (Нээлттэй өгөгдлийн сан): 36+ datasets from Монголбанк, ХААГ, УИХ, ЭМЯ, …
 *
 * We call the JSON API the portal itself publishes: every dataset page has an "API харах"
 * button that hands out https://opendata.mn/apiv1/file/{id}?fileType=json&section=1 with
 * code samples, and the terms allow reuse with attribution. Its robots.txt disallows
 * /apiv1/ for crawlers (search engines indexing API routes); we are not crawling links but
 * calling the documented API, so the robots check is skipped for these URLs only. The
 * 8-second per-host delay and our bot User-Agent still apply, and a full sync runs at most
 * twice a day.
 */
export const PORTAL = "opendata.mn";
const BASE = "https://opendata.mn";

export const fileApiUrl = (id: number) => `${BASE}/apiv1/file/${id}?fileType=json&section=1`;
export const datasetPageUrl = (categoryId: number, id: number) => `${BASE}/database/${categoryId}/${id}`;

const ListItem = z.object({ id: z.number(), published: z.boolean().nullish() });

const Meta = z.object({
  id: z.number(),
  category_id: z.number(),
  change_name: z.string(),
  file_type: z.string().nullish(),
  data_source: z.string().nullish(),
  file_description: z.string().nullish(),
  file_update_frequency: z.string().nullish(),
  updated_at: z.string().nullish(),
  published: z.boolean().nullish(),
  quality: z.object({ rows_count: z.number().nullish() }).nullish(),
  LicenseModel: z.object({ short_name: z.string().nullish(), name: z.string().nullish() }).nullish(),
  OrganizationModel: z.object({ name: z.string().nullish() }).nullish(),
  DataDictionary: z.array(z.object({ name: z.string().nullish(), col_name: z.string().nullish(), order_id: z.number().nullish() })).nullish(),
});

const Category = z.object({ id: z.number(), title: z.string() });

export type DatasetMeta = z.infer<typeof Meta> & { categoryTitle: string };

async function getJson(url: string, timeoutMs = 60_000): Promise<unknown> {
  const res = await politeFetch(url, { skipRobots: true, timeoutMs, headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.json();
}

const resultOf = (body: unknown) => (body && typeof body === "object" && "result" in body ? (body as { result: unknown }).result : body);

/** Ids of every published dataset file. */
export async function listDatasetIds(): Promise<number[]> {
  const items = z.array(ListItem).parse(resultOf(await getJson(`${BASE}/apiv1/dataset-file`)));
  return items.filter((i) => i.published !== false).map((i) => i.id);
}

export async function listCategories(): Promise<Map<number, string>> {
  const items = z.array(Category).parse(resultOf(await getJson(`${BASE}/apiv1/category/published`)));
  return new Map(items.map((c) => [c.id, c.title]));
}

/** Small metadata document (columns, license, original publisher) without the rows. */
export async function fetchMeta(id: number, categories: Map<number, string>): Promise<DatasetMeta> {
  const meta = Meta.parse(resultOf(await getJson(`${BASE}/apiv1/dataset-file-static/${id}`)));
  return { ...meta, categoryTitle: categories.get(meta.category_id) ?? "Бусад" };
}

/** All rows of a dataset (can be tens of MB: only used for the few datasets we summarize). */
export async function fetchRows(id: number): Promise<Row[]> {
  const body = resultOf(await getJson(fileApiUrl(id), 240_000));
  if (!Array.isArray(body)) throw new Error(`dataset ${id}: expected an array of rows`);
  return body as Row[];
}

export function columnNames(meta: DatasetMeta): string[] {
  return (meta.DataDictionary ?? [])
    .slice()
    .sort((a, b) => (a.order_id ?? 0) - (b.order_id ?? 0))
    .map((c) => (c.name || c.col_name || "").trim())
    .filter(Boolean);
}
