import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE, isValidToken } from "@/lib/admin-auth";

/** Optimistic guard for /admin. Real checks happen in requireAdmin() on every page and action. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  if (await isValidToken(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
