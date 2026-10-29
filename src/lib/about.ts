/**
 * "Бид хэн бэ" (/about): the five paragraphs the owner edits in /admin (app_settings key "about").
 * The defaults state only what the code and the public pages already prove (open source, costs on
 * /transparency, corrections and source changes on the page); who runs the site is the owner's to
 * write. Plain text: blank lines separate paragraphs, nothing is rendered as HTML.
 */
export const ABOUT_KEY = "about";

export interface About {
  /** What "ил тод" means for this site: the opening paragraph. */
  lead: string;
  /** Who runs it. */
  who: string;
  /** Where the money comes from and where it goes. */
  funding: string;
  /** Editorial independence and the no-accusation rule. */
  independence: string;
  /** How mistakes are fixed. */
  corrections: string;
}

export const ABOUT_FIELDS: { key: keyof About; label: string; hint: string; max: number }[] = [
  { key: "lead", label: "«Ил тод» гэж юу вэ (эхний догол мөр)", hint: "Нэрийн утга, сайтын зорилго.", max: 1200 },
  { key: "who", label: "Хэн ажиллуулдаг вэ", hint: "Нэр, баг, хэдийнээс эхэлсэн.", max: 1500 },
  { key: "funding", label: "Санхүүжилт", hint: "Мөнгө хаанаас ирж, юунд зарцуулагддаг.", max: 1500 },
  { key: "independence", label: "Хараат бус байдал, зарчим", hint: "Нам, компаниас хараат бус байдал, буруутгахгүй зарчим.", max: 1500 },
  { key: "corrections", label: "Алдаа, залруулга", hint: "Алдааг хэрхэн мэдэгдэж, засдаг вэ.", max: 1500 },
];

export const DEFAULT_ABOUT: About = {
  lead: "Ил тод гэдэг нь нуух юмгүй гэсэн үг. Бид төрийн байгууллагуудын өөрсдийн нийтэлсэн мэдээ, тоо баримтыг нэг дор цуглуулж, хэн юу шийдсэн, хэдэн төгрөг зарцуулсныг эх сурвалжтай нь харуулдаг. Мэдээ бүрийг уншигч өөрөө шалгаж болдог байх ёстой гэж бид үздэг.",
  who: "ИЛ ТОД МЭДЭЭ бол нээлттэй эхийн, бие даасан төсөл. Сайтын бүх код GitHub дээр нээлттэй: хэн ч уншиж, шалгаж, алдааг нь олж, засвар санал болгож болно.",
  funding: "Сайт үнэгүй дэд бүтэц дээр ажилладаг. AI-ийн зардал, хандивын орлогыг сар бүр Ил тод тайланд нийтэлдэг: AI-ийн дуудлага бүрийн зардал хүртэл харагдана.",
  independence: "Бид аль нэг нам, улс төрч, компанийн байр суурийг илэрхийлдэггүй, хэнийг ч буруутгадаггүй. Албан эх сурвалжийн баримтыг харуулж, дүгнэлтийг уншигчид үлдээнэ. AI-ийн өгсөн оноо бол үнэлгээ, баримт биш.",
  corrections: "Алдаа олвол бидэнд бичээрэй. Баталгаажсан алдааг засаж, засварласан гэдгийг мэдээн дээр нь тэмдэглэнэ. Төрийн байгууллага эх мэдээгээ өөрчилсөн, устгасныг «Өөрчлөлт» хуудсанд автоматаар бүртгэдэг.",
};

/** One field as stored: no control characters but newlines, at most `max` characters. */
export function cleanAboutText(raw: unknown, max: number): string {
  return String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/** Stored JSON → About; a missing, empty or malformed field falls back to its default. */
export function parseAbout(raw: string | null | undefined): About {
  let v: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(raw ?? "");
    if (parsed && typeof parsed === "object") v = parsed as Record<string, unknown>;
  } catch {
    // keep the defaults
  }
  const out = { ...DEFAULT_ABOUT };
  for (const f of ABOUT_FIELDS) {
    const text = cleanAboutText(v[f.key], f.max);
    if (text) out[f.key] = text;
  }
  return out;
}

/** Blank lines separate paragraphs; a single newline stays a line break inside one. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
