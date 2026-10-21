import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers } from "@/components/providers";
import { InstallBanner } from "@/components/pwa/pwa-controls";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { jsonLd, SITE_ALTERNATE_NAMES, SITE_DESCRIPTION, SITE_KEYWORDS, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/site";

import "./globals.css";

// Untitled UI's theme reads --font-inter; Cyrillic subset is required for Mongolian.
const inter = Inter({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-inter", display: "swap" });

const verification: Metadata["verification"] = {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } : undefined,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  // iOS home-screen app: full-screen, status bar over the page (safe-area padding in CSS).
  appleWebApp: { capable: true, title: "ИЛ ТОД", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  title: { default: SITE_TITLE, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  category: "news",
  alternates: { types: { "application/rss+xml": [{ url: "/feed.xml", title: `${SITE_NAME} — шинэ мэдээ` }] } },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  openGraph: { type: "website", locale: "mn_MN", siteName: SITE_NAME, title: SITE_TITLE, description: SITE_DESCRIPTION },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
  verification,
};

/** Site-wide structured data: who publishes (Organization) and the site itself (WebSite). */
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NewsMediaOrganization",
      "@id": `${SITE_URL}/#org`,
      name: SITE_NAME,
      alternateName: SITE_ALTERNATE_NAMES,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icons/icon-512.png`, width: 512, height: 512 },
      sameAs: [process.env.NEXT_PUBLIC_GITHUB_REPO || "https://github.com/tmorius-eng/UNENMEDEE"],
      publishingPrinciples: `${SITE_URL}/transparency`,
    },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, alternateName: SITE_ALTERNATE_NAMES, description: SITE_DESCRIPTION, inLanguage: "mn", publisher: { "@id": `${SITE_URL}/#org` } },
  ],
};

export const viewport: Viewport = {
  // Content can reach the notch area; header/footer pad with env(safe-area-inset-*).
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0c111d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mn" className={`${inter.variable} h-full scroll-smooth antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-secondary_alt text-primary">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(SITE_JSON_LD) }} />
        <Providers>
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-8 md:px-8">{children}</main>
          <SiteFooter />
          <InstallBanner />
        </Providers>
        <ServiceWorkerRegister />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
