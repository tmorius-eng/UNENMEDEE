import type { MetadataRoute } from "next";

import { THEME_COLOR } from "@/lib/site";

/** Installable app (PWA): Android/desktop install prompt, iOS "Add to Home Screen". */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ИЛ ТОД МЭДЭЭ",
    short_name: "ИЛ ТОД",
    description: "Монголын төрийн мэдээ, тендер, төсвийг AI-аар шүүж, баримтыг пи-араас салгадаг нээлттэй платформ.",
    lang: "mn",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLOR.light,
    theme_color: THEME_COLOR.brand,
    categories: ["news", "politics", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Онцлох тойм", url: "/digest", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Эрсдэлтэй тендер", url: "/risk", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Нээлттэй өгөгдөл", url: "/data", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
