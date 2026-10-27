import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE, isValidToken } from "@/lib/admin-auth";
import { TOPICS } from "@/lib/topics";

/** Feed filters that moved from "/?f=<key>" to static "/topic/<key>" pages. */
const FEED_KEYS = new Set(["risk", "budget", "ministry", ...TOPICS.map((t) => t.key)]);

/**
 * Old "/?f=<key>" links → "/topic/<key>", and "/topic/<key>?f=…" (what the earlier next.config
 * redirect produced: its redirects always carry the query along) → the clean URL. Search Console
 * listed both as duplicates; the matcher only runs this when an `f` parameter is present.
 */
function cleanFeedUrl(request: NextRequest) {
  const url = request.nextUrl.clone();
  const f = url.searchParams.get("f");
  url.searchParams.delete("f");
  if (url.pathname === "/" && f && FEED_KEYS.has(f)) url.pathname = `/topic/${f}`;
  return NextResponse.redirect(url, 308);
}

/** Optimistic guard for /admin. Real checks happen in requireAdmin() on every page and action. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin")) return cleanFeedUrl(request);
  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  if (await isValidToken(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", { source: "/", has: [{ type: "query", key: "f" }] }, { source: "/topic/:key", has: [{ type: "query", key: "f" }] }],
};
