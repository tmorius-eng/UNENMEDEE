import type { MetadataRoute } from "next";

import { getPoliticianIds, getSitemapSlugs } from "@/lib/queries";
import { absoluteUrl } from "@/lib/site";
import { TOPICS } from "@/lib/topics";

/** Every public page and article. Builds without a database (static pages only). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, officials] = await Promise.all([getSitemapSlugs(45_000) /* a sitemap holds 50k URLs: every published article is listed */, getPoliticianIds()]);
  const newest = articles[0]?.lastModified;
  const pages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: newest, changeFrequency: "hourly", priority: 1 },
    { url: absoluteUrl("/digest"), lastModified: newest, changeFrequency: "hourly", priority: 0.9 },
    { url: absoluteUrl("/risk"), changeFrequency: "hourly", priority: 0.8 },
    { url: absoluteUrl("/topic/risk"), changeFrequency: "hourly", priority: 0.7 },
    { url: absoluteUrl("/clusters"), changeFrequency: "hourly", priority: 0.7 },
    { url: absoluteUrl("/data"), changeFrequency: "daily", priority: 0.6 },
    { url: absoluteUrl("/officials"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/officials/companies"), changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/budget"), changeFrequency: "weekly", priority: 0.8 },
    { url: absoluteUrl("/tax"), changeFrequency: "monthly", priority: 0.7 },
    { url: absoluteUrl("/laws"), changeFrequency: "daily", priority: 0.8 },
    { url: absoluteUrl("/support"), changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: absoluteUrl("/sources"), changeFrequency: "daily", priority: 0.4 },
    { url: absoluteUrl("/transparency"), changeFrequency: "daily", priority: 0.4 },
    { url: absoluteUrl("/changes"), changeFrequency: "weekly", priority: 0.5 },
    { url: absoluteUrl("/method"), changeFrequency: "monthly", priority: 0.4 },
    ...TOPICS.map((t) => ({ url: absoluteUrl(`/topic/${t.key}`), changeFrequency: "hourly" as const, priority: 0.8 })),
  ];
  return [
    ...pages,
    ...officials.map((id) => ({ url: absoluteUrl(`/officials/${id}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    ...articles.map((a) => ({ url: absoluteUrl(`/article/${a.slug}`), lastModified: a.lastModified, changeFrequency: "weekly" as const, priority: 0.7 })),
  ];
}
