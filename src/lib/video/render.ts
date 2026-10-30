/**
 * Node-only: the narration's pauses (ffmpeg silencedetect) and the MP4 itself (Playwright
 * screenshots every frame of scene-html.ts into ffmpeg, H.264 + AAC, faststart). Runs in GitHub
 * Actions (scripts/make-video.ts), never in a page or a Vercel function.
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { FRAME } from "./scene-html";
import { parseSilences, type Silence } from "./timing";

export const FPS = 30;
/** Meta fetches the file from our /reel route; Vercel answers at most 4.5 MB per response. */
export const MAX_BYTES = 4_000_000;

function run(cmd: string, args: string[], input?: Buffer): Promise<{ stdout: Buffer; stderr: string }> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["pipe", "pipe", "pipe"] });
    const out: Buffer[] = [];
    let err = "";
    p.stdout.on("data", (d: Buffer) => out.push(d));
    p.stderr.on("data", (d: Buffer) => (err += d.toString()));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve({ stdout: Buffer.concat(out), stderr: err }) : reject(new Error(`${cmd} exited ${code}: ${err.slice(-400)}`))));
    if (input) p.stdin.end(input);
    else p.stdin.end();
  });
}

/** Duration (s) and the pauses of a WAV file. */
export async function analyseAudio(wav: Buffer): Promise<{ duration: number; silences: Silence[] }> {
  const dir = await mkdtemp(path.join(tmpdir(), "iltod-audio-"));
  try {
    const file = path.join(dir, "voice.wav");
    await writeFile(file, wav);
    const probe = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]);
    const duration = Number(probe.stdout.toString().trim());
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("narration has no duration");
    const { stderr } = await run("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-38dB:d=0.18", "-f", "null", "-"]);
    return { duration, silences: parseSilences(stderr, duration) };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Renders `html` for `total` seconds over the narration and returns the MP4 bytes. */
export async function renderVideo(opts: { html: string; wav: Buffer; total: number; crf?: number }): Promise<Buffer> {
  const { chromium } = await import("playwright");
  const dir = await mkdtemp(path.join(tmpdir(), "iltod-video-"));
  // CHROMIUM_PATH: a browser installed outside Playwright (local previews); Actions installs its own.
  const browser = await chromium.launch({ args: ["--allow-file-access-from-files"], executablePath: process.env.CHROMIUM_PATH || undefined });
  try {
    const page = await browser.newPage({ viewport: FRAME, deviceScaleFactor: 1 });
    const htmlFile = path.join(dir, "scene.html");
    const wavFile = path.join(dir, "voice.wav");
    const out = path.join(dir, "video.mp4");
    await writeFile(htmlFile, opts.html);
    await writeFile(wavFile, opts.wav);
    await page.goto(`file://${htmlFile}`);
    await page.evaluate(async () => {
      await document.fonts.ready;
      (window as unknown as { fit: () => void }).fit();
    });
    const frames = Math.ceil(opts.total * FPS);
    const ff = spawn(
      "ffmpeg",
      [
        "-y", "-loglevel", "error",
        "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
        "-i", wavFile,
        "-filter_complex", `[1:a]loudnorm=I=-16:TP=-1.5,apad=whole_dur=${opts.total}[a]`,
        "-map", "0:v", "-map", "[a]",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-profile:v", "high", "-crf", String(opts.crf ?? 21), "-preset", "medium",
        "-c:a", "aac", "-b:a", "128k", "-ar", "48000", "-ac", "2",
        "-t", String(opts.total), "-movflags", "+faststart", out,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let ffErr = "";
    ff.stderr.on("data", (d: Buffer) => (ffErr += d.toString()));
    const done = new Promise<void>((resolve, reject) => {
      ff.on("error", reject);
      ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}: ${ffErr.slice(-400)}`))));
    });
    for (let i = 0; i < frames; i++) {
      await page.evaluate((t) => (window as unknown as { render: (t: number) => void }).render(t), i / FPS);
      const jpg = await page.screenshot({ type: "jpeg", quality: 92 });
      if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
    }
    ff.stdin.end();
    await done;
    return await readFile(out);
  } finally {
    await browser.close();
    await rm(dir, { recursive: true, force: true });
  }
}
