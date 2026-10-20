import * as cheerio from "cheerio";

import { AIMAG_SLUGS } from "@/lib/sources";
import type { SourceCategory } from "@/lib/types";

import { cleanTitle } from "./extractor";

/** Subdomains that are infrastructure, not news publishers. */
const INFRA_SUBDOMAIN =
  /^(www\d*|mail|webmail|smtp|imap|pop|mx|ns\d*|cdn|static|img|images?|files?|media|photo|video|api|cms|admin|login|sso|auth|vpn|chat|check|career|jobs?|license|helpdesk|support|test|dev|staging|beta|old|en|ru|zh|ftp)\./i;

/** Government hosts: *.gov.mn and the citizens' representative councils (*.khural.mn). */
export function isGovernmentHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^www\./, "");
  return /\.gov\.mn$/.test(h) || h === "gov.mn" || /(^|\.)khural\.mn$/.test(h);
}

export function canonicalHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/** True for infrastructure subdomains (cdn., mail., api., ...) that never publish news. */
export function isInfrastructureHost(host: string): boolean {
  return INFRA_SUBDOMAIN.test(`${canonicalHost(host).split(".")[0]}.`);
}

/**
 * Guesses a category for a newly discovered government domain. All ministries are
 * already in the curated seed, so anything new is local government or an agency.
 */
export function classifyDomain(host: string): SourceCategory {
  const h = canonicalHost(host);
  if (/(^|\.)khural\.mn$/.test(h) || /\.ub\.gov\.mn$/.test(h)) return "local";
  if (AIMAG_SLUGS.includes(h.split(".")[0])) return "local";
  return "agency";
}

/** Extracts every government host linked from a page. */
export function harvestGovernmentHosts(html: string, pageUrl: string): string[] {
  const $ = cheerio.load(html);
  const hosts = new Set<string>();
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const u = new URL(href, pageUrl);
      if (/^https?:$/.test(u.protocol) && isGovernmentHost(u.hostname)) hosts.add(canonicalHost(u.hostname));
    } catch {
      /* ignore bad URLs */
    }
  });
  // Plain-text URLs in footers / JSON blobs.
  for (const m of html.matchAll(/https?:\/\/([a-z0-9.-]+\.(?:gov\.mn|khural\.mn))/gi)) hosts.add(canonicalHost(m[1]));
  return [...hosts].filter((h) => !isInfrastructureHost(h));
}

/** Best-effort organization name from a homepage. */
export function siteName(html: string, fallback: string): string {
  const $ = cheerio.load(html);
  const candidates = [
    $('meta[property="og:site_name"]').attr("content"),
    $("title").first().text(),
    $('meta[property="og:title"]').attr("content"),
  ];
  for (const c of candidates) {
    const t = c ? cleanTitle(c).replace(/^(Нүүр( хуудас)?|Эхлэл|Home|Index of \/)\s*[-|]?\s*/i, "").trim() : "";
    if (t.length >= 3 && !/^(Index of|403|404|Just a moment)/i.test(t)) return t.slice(0, 200);
  }
  return fallback;
}
