import type { Metadata } from "next";

import { HomeFeed } from "@/components/iltod/home-feed";
import { SITE_NAME } from "@/lib/site";

// Static: no searchParams here (topics live at /topic/<key>), so the page is prerendered and its
// metadata lands in <head>. Old /?f=<topic> links redirect in next.config.ts.
export const metadata: Metadata = {
  alternates: { canonical: "/", types: { "application/rss+xml": [{ url: "/feed.xml", title: `${SITE_NAME} — шинэ мэдээ` }] } },
};

export default function HomePage() {
  return <HomeFeed filter="all" />;
}
