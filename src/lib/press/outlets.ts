/**
 * Independent newsrooms we compare government stories with. Headlines and links only are read and
 * stored (src/db/schema.ts press_items): no text, no images. Each site's
 * robots.txt allows us (Oct 2026), and politeFetch checks it and keeps 8 s between requests.
 *
 * Checked and left out (Oct 2026): montsame.mn (the feed answers 403: not worked around), gogo.mn,
 * unuudur.mn, eagle.mn, isee.mn (no feed or API), ugluu.mn (reprints parliament.mn word for word,
 * so it would make every parliament story look "covered").
 */
export interface Outlet {
  domain: string;
  name: string;
  feed: string;
  kind: "rss" | "news-mn";
}

export const OUTLETS: Outlet[] = [
  { domain: "ikon.mn", name: "iKon.mn", feed: "https://ikon.mn/rss", kind: "rss" },
  { domain: "news.mn", name: "News.mn", feed: "https://news.mn/wp-json/wp/v2/posts?per_page=100&_fields=id,title", kind: "news-mn" },
  { domain: "sonin.mn", name: "Sonin.mn", feed: "https://www.sonin.mn/rss", kind: "rss" },
];

/** Day the press feeds were first read: older stories never get the "not found in the press" note. */
export const PRESS_TRACKING_FROM = new Date("2026-10-29T00:00:00+08:00");
/** The "not found in the press" note: important stories only, and only once the press had a day. */
export const BLINDSPOT_MIN_IMPORTANCE = 70;
export const BLINDSPOT_AFTER_HOURS = 24;

/**
 * An important story none of the outlets we read wrote about (Ground News' "blindspot"). Worded on
 * the page as "we did not find it", never "the press ignored it": we read three newsrooms' feeds.
 */
export function isPressBlindspot(a: { importanceScore: number | null; publishedAt: Date | null; pressCount: number; dateUnknown?: boolean }, now: Date): boolean {
  if (a.pressCount > 0 || a.dateUnknown || !a.publishedAt) return false;
  if ((a.importanceScore ?? 0) < BLINDSPOT_MIN_IMPORTANCE) return false;
  if (a.publishedAt < PRESS_TRACKING_FROM) return false;
  return now.getTime() - a.publishedAt.getTime() >= BLINDSPOT_AFTER_HOURS * 3_600_000;
}

export const outletNames = () => OUTLETS.map((o) => o.domain).join(", ");
