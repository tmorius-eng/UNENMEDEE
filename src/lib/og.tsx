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

/** Social feed card (1080×1350, 4:5): the "hook" style shared by Instagram, Facebook and Threads. */
export const FEED_SIZE = { width: 1080, height: 1350 };

const HOOK_FAMILY = "InterDisplay";
let hookFont: Promise<Buffer> | undefined;
function loadHookFont() {
  // Inter Display Black Italic, subset like inter-700.woff (Latin, Cyrillic, Ө Ү, ₮).
  hookFont ??= readFile(join(process.cwd(), "src/assets/fonts/inter-display-900i.woff"));
  return hookFont;
}

const YELLOW = "#ffd60a";

/**
 * Bold typographic card: dark background, yellow frame, the label as a yellow pill, the headline in
 * huge black italic capitals with its strongest fact in yellow (hookWords), an optional sub-line
 * ("why it matters" / the first summary sentence) and up to three more headlines.
 */
export async function hookCard({ label, words, sub, more = [], footer }: { label: string; words: { word: string; hot: boolean }[]; sub?: string; more?: string[]; footer: string }) {
  const [regular, black, markSrc] = await Promise.all([loadFonts(), loadHookFont(), loadMark()]);
  const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  const length = words.reduce((n, w) => n + w.word.length + 1, 0);
  const size = length > 110 ? 62 : length > 80 ? 72 : length > 55 ? 86 : 100;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", padding: 16, background: YELLOW, fontFamily: FONT_FAMILY }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "56px 64px", background: "linear-gradient(160deg, #1d1856 0%, #0b0a24 70%)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ display: "flex", background: "#ffffff", borderRadius: 18, padding: "10px 14px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> */}
                <img src={markSrc} width={104} height={64} alt="" />
              </div>
              <span style={{ fontSize: 30, color: "#ffffff", letterSpacing: 1 }}>ИЛ ТОД МЭДЭЭ</span>
            </div>
            <div style={{ display: "flex", background: YELLOW, color: "#0b0a24", fontSize: 26, padding: "10px 20px", borderRadius: 999 }}>{clip(label.toUpperCase(), 32)}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{ display: "flex", flexWrap: "wrap", fontFamily: HOOK_FAMILY, fontSize: size, lineHeight: 1.04, letterSpacing: -1 }}>
              {words.slice(0, 40).map((w, i) => (
                <span key={i} style={{ color: w.hot ? YELLOW : "#ffffff", marginRight: size * 0.24 }}>
                  {w.word.toUpperCase()}
                </span>
              ))}
            </div>
            {sub && <div style={{ display: "flex", fontSize: 34, lineHeight: 1.3, color: "#d0d5dd" }}>→ {clip(sub, 170)}</div>}
            {more.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, borderLeft: `6px solid ${YELLOW}`, paddingLeft: 22 }}>
                {more.slice(0, 3).map((line, i) => (
                  <span key={i} style={{ fontSize: 28, lineHeight: 1.25, color: "#e4e7ec" }}>
                    + {clip(line, 80)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28, color: "#98a2b3" }}>
            <span>{clip(footer, 46)}</span>
            <span style={{ color: YELLOW }}>iltodmedee.mn</span>
          </div>
        </div>
      </div>
    ),
    {
      ...FEED_SIZE,
      fonts: [
        { name: FONT_FAMILY, data: regular, weight: 700 as const, style: "normal" as const },
        { name: HOOK_FAMILY, data: black, weight: 700 as const, style: "normal" as const },
      ],
    },
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
