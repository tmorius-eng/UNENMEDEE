import { cacheLife } from "next/cache";

import { CONTACT_EMAIL, PRODUCTION_URL, REPO_URL } from "@/lib/site";

/**
 * RFC 9116 security.txt. `Expires` must stay in the future (at most a year ahead), and a static
 * file in public/ would have expired on its own after a year with nobody editing it, so it is
 * computed: one year from when the cached copy was made, refreshed daily.
 */
async function securityTxt(): Promise<string> {
  "use cache";
  cacheLife("days");
  const expires = new Date(Date.now() + 365 * 86_400_000);
  expires.setUTCHours(0, 0, 0, 0);
  return [
    `Contact: mailto:${CONTACT_EMAIL}`,
    `Contact: ${REPO_URL}/security/advisories/new`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: mn, en",
    `Canonical: ${PRODUCTION_URL}/.well-known/security.txt`,
    `Policy: ${REPO_URL}/blob/main/SECURITY.md`,
    "",
  ].join("\n");
}

export async function GET() {
  return new Response(await securityTxt(), { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=86400" } });
}
