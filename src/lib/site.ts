/**
 * One place for the public URL, name and search wording. Used by metadata, robots, sitemaps,
 * RSS and JSON-LD so Google sees the same canonical host everywhere.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000")
).replace(/\/+$/, "");

export const SITE_NAME = "ИЛ ТОД";
export const SITE_TITLE = "ИЛ ТОД — Монголын улс төр, эдийн засаг, төрийн шинэ мэдээ";
export const SITE_DESCRIPTION =
  "Өнөөдрийн мэдээ: УИХ, Засгийн газар, яамд, тендер, төсөв, авлигын хэргийн шинэ мэдээг 90 гаруй төрийн эх сурвалжаас 2 цаг тутам цуглуулж, AI-аар баримтыг пи-араас салгасан Монголын нээлттэй мэдээний сайт.";

/** Mongolian search phrases people actually type (Cyrillic and common Latin spellings). */
export const SITE_KEYWORDS = [
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
