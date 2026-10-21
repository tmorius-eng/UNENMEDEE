import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/** Social preview cards (Facebook, Messenger, X, Google Discover): 1200×630 PNG. */
export const OG_SIZE = { width: 1200, height: 630 };

// Satori reads WOFF (not WOFF2). Inter 700 subsets cover Mongolian Cyrillic (Ө, Ү) and Latin.
// Each subset needs its own family name: Satori keeps one font per name + weight.
const FONTS = [
  { name: "InterLatin", file: "inter-700-latin.woff" },
  { name: "InterCyrillic", file: "inter-700-cyrillic.woff" },
  { name: "InterCyrillicExt", file: "inter-700-cyrillic-ext.woff" },
];
const FONT_FAMILY = FONTS.map((f) => f.name).join(", ");
let fonts: Promise<Buffer[]> | undefined;
function loadFonts() {
  fonts ??= Promise.all(FONTS.map((f) => readFile(join(process.cwd(), "src/assets/fonts", f.file))));
  return fonts;
}

export async function ogImage({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  const data = await loadFonts();
  const size = title.length > 90 ? 52 : title.length > 50 ? 62 : 76;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "#ffffff", fontFamily: FONT_FAMILY }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 72, height: 72, borderRadius: 18, background: "#155eef", color: "#ffffff", fontSize: 30 }}>ИТ</div>
          <div style={{ display: "flex", fontSize: 30, color: "#155eef", letterSpacing: 2 }}>{eyebrow.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", fontSize: size, lineHeight: 1.15, color: "#101828", letterSpacing: -1 }}>{title.length > 140 ? `${title.slice(0, 137)}…` : title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "4px solid #155eef", paddingTop: 24, fontSize: 26, color: "#475467" }}>
          <span>ИЛ ТОД · Пи-аргүй төрийн мэдээ</span>
          <span>{footer}</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: data.map((d, i) => ({ name: FONTS[i].name, data: d, weight: 700 as const, style: "normal" as const })) },
  );
}
