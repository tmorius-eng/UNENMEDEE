/**
 * One place for the public URL, name and search wording. Used by metadata, robots, sitemaps,
 * RSS and JSON-LD so Google sees the same canonical host everywhere.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

export const SITE_NAME = "ИЛ ТОД МЭДЭЭ";
/** The production address, for links made outside Vercel (GitHub Actions posting to Facebook). */
export const PRODUCTION_URL = "https://iltodmedee.mn";
/** The public source code (MIT). Linked from the footer, /method and /transparency. */
export const REPO_URL = "https://github.com/tmorius-eng/UNENMEDEE";
/** Contact for readers, partners and press (forwarded by Porkbun to the owner's inbox). */
export const CONTACT_EMAIL = "info@iltodmedee.mn";
/** A file or folder in the repository on the main branch. */
export const repoFile = (path: string) => `${REPO_URL}/blob/main/${path}`;
export const SITE_TITLE = "ИЛ ТОД МЭДЭЭ — Монголын улс төр, эдийн засаг, төрийн шинэ мэдээ";
export const SITE_DESCRIPTION =
  "ИЛ ТОД МЭДЭЭ (iltodmedee.mn) — өнөөдрийн мэдээ: УИХ, Засгийн газар, яамд, тендер, төсөв, авлигын хэргийн шинэ мэдээг 90 гаруй төрийн эх сурвалжаас 2 цаг тутам цуглуулж, AI-аар баримтыг пи-араас салгасан Монголын нээлттэй мэдээний сайт.";

/** Mongolian search phrases people actually type (Cyrillic and common Latin spellings). */
export const SITE_KEYWORDS = [
  "ИЛ ТОД МЭДЭЭ",
  "iltodmedee",
  "iltodmedee.mn",
  "il tod medee",
  "мэдээ",
  "шинэ мэдээ",
  "өнөөдрийн мэдээ",
  "Монголын мэдээ",
  "улс төр",
  "улс төрийн мэдээ",
  "эдийн засаг",
  "эдийн засгийн мэдээ",
  "УИХ",
  "Улсын Их Хурал",
  "Засгийн газар",
  "Засгийн газрын шийдвэр",
  "яам",
  "тендер",
  "худалдан авах ажиллагаа",
  "төсөв",
  "авлига",
  "Авлигатай тэмцэх газар",
  "хууль",
  "тогтоол",
  "уул уурхай",
  "эрүүл мэнд",
  "боловсрол",
  "орон нутаг",
  "нээлттэй өгөгдөл",
  "medee",
  "shine medee",
  "uls tur",
  "Mongolia news",
];

/** Every way people type the brand (Google "site name" + brand queries such as "iltodmedee"). */
export const SITE_ALTERNATE_NAMES = ["ИЛ ТОД", "iltodmedee", "iltodmedee.mn", "IL TOD MEDEE", "Il tod medee", "Ил тод мэдээ"];

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** JSON for a <script type="application/ld+json">: `<` escaped so text cannot close the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** XML text/attribute escaping for sitemaps and RSS. */
export function xmlEscape(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
}

/** A link we render from scraped data: only http(s) URLs, never `javascript:` or `data:`. */
export function safeHttpUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}
