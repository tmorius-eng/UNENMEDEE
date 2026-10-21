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
let mark: Promise<string> | undefined;
function loadMark() {
  mark ??= readFile(join(process.cwd(), "src/assets/brand/mark.png")).then((b) => `data:image/png;base64,${b.toString("base64")}`);
  return mark;
}

export async function ogImage({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  const [data, markSrc] = await Promise.all([loadFonts(), loadMark()]);
  const size = title.length > 90 ? 52 : title.length > 50 ? 62 : 76;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", background: "#ffffff", fontFamily: FONT_FAMILY }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
          <img src={markSrc} width={128} height={79} alt="" />
          <div style={{ display: "flex", fontSize: 30, color: "#05a39e", letterSpacing: 2 }}>{eyebrow.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", fontSize: size, lineHeight: 1.15, color: "#171043", letterSpacing: -1 }}>{title.length > 140 ? `${title.slice(0, 137)}…` : title}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "4px solid #05beb8", paddingTop: 24, fontSize: 26, color: "#475467" }}>
          <span>ИЛ ТОД МЭДЭЭ · iltodmedee.mn</span>
          <span>{footer}</span>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: data.map((d, i) => ({ name: FONTS[i].name, data: d, weight: 700 as const, style: "normal" as const })) },
  );
}

/** Instagram / Facebook story image (1080×1920), shared as a file from the phone share sheet. */
export const STORY_SIZE = { width: 1080, height: 1920 };

export async function storyImage({ eyebrow, title, footer }: { eyebrow: string; title: string; footer: string }) {
  const [data, markSrc] = await Promise.all([loadFonts(), loadMark()]);
  const size = title.length > 110 ? 64 : title.length > 60 ? 76 : 92;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "160px 88px 200px", background: "linear-gradient(180deg, #ffffff 0%, #e6fbfa 100%)", fontFamily: FONT_FAMILY }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
          <img src={markSrc} width={208} height={128} alt="" />
          <div style={{ display: "flex", fontSize: 40, color: "#047c78", letterSpacing: 3 }}>{eyebrow.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", fontSize: size, lineHeight: 1.15, color: "#171043", letterSpacing: -1 }}>{title.length > 160 ? `${title.slice(0, 157)}…` : title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, borderTop: "6px solid #05beb8", paddingTop: 36, fontSize: 38, color: "#475467" }}>
          <span>{footer}</span>
          <span style={{ color: "#171043" }}>iltodmedee.mn</span>
        </div>
      </div>
    ),
    { ...STORY_SIZE, fonts: data.map((d, i) => ({ name: FONTS[i].name, data: d, weight: 700 as const, style: "normal" as const })) },
  );
}
