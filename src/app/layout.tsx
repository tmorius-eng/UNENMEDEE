import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { Providers } from "@/components/providers";
import { InstallBanner } from "@/components/pwa/pwa-controls";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";

import "./globals.css";

// Untitled UI's theme reads --font-inter; Cyrillic subset is required for Mongolian.
const inter = Inter({ subsets: ["latin", "cyrillic", "cyrillic-ext"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  ),
  applicationName: "ИЛ ТОД",
  // iOS home-screen app: full-screen, status bar over the page (safe-area padding in CSS).
  appleWebApp: { capable: true, title: "ИЛ ТОД", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  title: { default: "ИЛ ТОД — Пи-аргүй төрийн мэдээ", template: "%s · ИЛ ТОД" },
  description:
    "Монголын төрийн байгууллагуудын мэдээ, тендер, төсвийг автоматаар цуглуулж, баримтыг пи-араас салгадаг нээлттэй эхийн AI платформ.",
  openGraph: { type: "website", locale: "mn_MN", siteName: "ИЛ ТОД" },
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
