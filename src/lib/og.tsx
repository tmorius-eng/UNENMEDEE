import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

/** Social preview cards (Facebook, Messenger, X, Google Discover): 1200×630 PNG. */
export const OG_SIZE = { width: 1200, height: 630 };

// Satori reads WOFF (not WOFF2). One Inter 700 subset covers Latin, Mongolian Cyrillic (Ө, Ү) and ₮
// (U+20AE), built from the Inter release with pyftsubset (see CLAUDE.md §6c).
const FONT_FAMILY = "Inter";
let fonts: Promise<Buffer> | undefined;
function loadFonts() {
  fonts ??= readFile(join(process.cwd(), "src/assets/fonts/inter-700.woff"));
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
    { ...OG_SIZE, fonts: [{ name: FONT_FAMILY, data, weight: 700 as const, style: "normal" as const }] },
  );
}

/** Instagram feed card (1080×1350, 4:5): label, headline and up to five numbered lines or a summary. */
export const FEED_SIZE = { width: 1080, height: 1350 };

export async function feedCard({ eyebrow, title, lines, footer }: { eyebrow: string; title: string; lines: string[]; footer: string }) {
  const [data, markSrc] = await Promise.all([loadFonts(), loadMark()]);
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  const size = lines.length > 0 ? (title.length > 70 ? 50 : 60) : title.length > 110 ? 64 : title.length > 60 ? 76 : 88;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 80px", background: "linear-gradient(180deg, #ffffff 0%, #e6fbfa 100%)", fontFamily: FONT_FAMILY }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
          <img src={markSrc} width={156} height={96} alt="" />
          <div style={{ display: "flex", fontSize: 34, color: "#047c78", letterSpacing: 2 }}>{clip(eyebrow.toUpperCase(), 40)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
          <div style={{ display: "flex", fontSize: size, lineHeight: 1.15, color: "#171043", letterSpacing: -1 }}>{clip(title, lines.length > 0 ? 110 : 170)}</div>
          {lines.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {lines.slice(0, 5).map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 18, fontSize: 32, lineHeight: 1.25, color: "#344054" }}>
                  <span style={{ color: "#05a39e", minWidth: 40 }}>{i + 1}.</span>
                  <span style={{ display: "flex", flex: 1 }}>{clip(line, 120)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "6px solid #05beb8", paddingTop: 28, fontSize: 30, color: "#475467" }}>
          <span>{clip(footer, 40)}</span>
          <span style={{ color: "#171043" }}>iltodmedee.mn</span>
        </div>
      </div>
    ),
    { ...FEED_SIZE, fonts: [{ name: FONT_FAMILY, data, weight: 700 as const, style: "normal" as const }] },
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
    { ...STORY_SIZE, fonts: [{ name: FONT_FAMILY, data, weight: 700 as const, style: "normal" as const }] },
  );
}
