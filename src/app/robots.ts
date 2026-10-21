import type { MetadataRoute } from "next";

import { absoluteUrl, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/admin/"] }],
    sitemap: [absoluteUrl("/sitemap.xml"), absoluteUrl("/news-sitemap.xml")],
    host: SITE_URL,
  };
}
