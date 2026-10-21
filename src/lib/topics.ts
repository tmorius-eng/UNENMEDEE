import type { SourceCategory } from "@/lib/types";

/**
 * Reader-facing topics (the Kagi-style colored label above each headline and the bottom
 * topic bar). Derived from the source, not from the model: deterministic, free, and every
 * monitored source belongs to exactly one topic. Aimag/district sites form "Орон нутаг".
 */
export interface Topic {
  key: string;
  /** Bottom bar / filter label. */
  label: string;
  /** Uppercase label above headlines. */
  tag: string;
  /** Untitled UI utility color (adapts to dark mode). */
  color: string;
  domains: string[];
}

export const TOPICS: Topic[] = [
  {
    key: "politics",
    label: "Улс төр",
    tag: "УЛС ТӨР",
    color: "text-utility-blue-700",
    domains: ["parliament.mn", "president.mn", "zasag.mn", "cabinet.gov.mn", "gov.mn", "nsc.gov.mn", "csc.gov.mn", "ncoe.gov.mn", "khural.mn"],
  },
  {
    key: "economy",
    label: "Эдийн засаг",
    tag: "ЭДИЙН ЗАСАГ",
    color: "text-utility-amber-700",
    domains: ["mof.gov.mn", "med.gov.mn", "mongolbank.mn", "frc.mn", "mta.gov.mn", "customs.gov.mn", "nso.mn", "pcsp.gov.mn", "chinggiskhaanswf.mn", "sme.gov.mn", "afccp.gov.mn", "ipom.gov.mn", "masm.gov.mn", "mpr.gov.mn", "shilendans.gov.mn", "tender.gov.mn"],
  },
  {
    key: "corruption",
    label: "Авлига, хяналт",
    tag: "АВЛИГА, ХЯНАЛТ",
    color: "text-utility-red-700",
    domains: ["iaac.mn", "audit.mn", "inspection.gov.mn"],
  },
  {
    key: "justice",
    label: "Хууль, шүүх",
    tag: "ХУУЛЬ, ШҮҮХ",
    color: "text-utility-purple-700",
    domains: ["legalinfo.mn", "mojha.gov.mn", "supremecourt.mn", "judcouncil.mn", "constcourt.mn", "cd.gov.mn", "nfa.gov.mn", "police.gov.mn", "bpo.gov.mn", "sspa.gov.mn", "immigration.gov.mn", "burtgel.gov.mn", "nhrcm.gov.mn"],
  },
  {
    key: "mining",
    label: "Уул уурхай, эрчим хүч",
    tag: "УУЛ УУРХАЙ, ЭРЧИМ ХҮЧ",
    color: "text-utility-orange-700",
    domains: ["mimr.gov.mn", "mrpam.gov.mn", "energy.gov.mn"],
  },
  {
    key: "health",
    label: "Эрүүл мэнд",
    tag: "ЭРҮҮЛ МЭНД",
    color: "text-utility-emerald-700",
    domains: ["moh.gov.mn", "emd.gov.mn", "mmra.gov.mn"],
  },
  {
    key: "education",
    label: "Боловсрол, соёл",
    tag: "БОЛОВСРОЛ, СОЁЛ",
    color: "text-utility-fuchsia-700",
    domains: ["meds.gov.mn", "mocsty.gov.mn", "culture.gov.mn", "sport.gov.mn", "naog.gov.mn"],
  },
  {
    key: "society",
    label: "Нийгэм",
    tag: "НИЙГЭМ",
    color: "text-utility-pink-700",
    domains: ["mlsp.gov.mn", "ndaatgal.mn", "ncge.gov.mn"],
  },
  {
    key: "environment",
    label: "Байгаль, хөдөө аж ахуй",
    tag: "БАЙГАЛЬ ОРЧИН",
    color: "text-utility-green-700",
    domains: ["mecc.gov.mn", "water.gov.mn", "namem.gov.mn", "mofa.gov.mn"],
  },
  {
    key: "infrastructure",
    label: "Дэд бүтэц, технологи",
    tag: "ДЭД БҮТЭЦ",
    color: "text-utility-sky-700",
    domains: ["mrt.gov.mn", "mcud.gov.mn", "mddic.gov.mn", "crc.gov.mn", "mcaa.gov.mn", "gazar.gov.mn"],
  },
  {
    key: "foreign",
    label: "Гадаад, батлан хамгаалах",
    tag: "ГАДААД ХАРИЛЦАА",
    color: "text-utility-indigo-700",
    domains: ["mfa.gov.mn", "mod.gov.mn"],
  },
  { key: "local", label: "Орон нутаг", tag: "ОРОН НУТАГ", color: "text-utility-yellow-700", domains: [] },
  { key: "data", label: "Нээлттэй өгөгдөл", tag: "НЭЭЛТТЭЙ ӨГӨГДӨЛ", color: "text-utility-slate-700", domains: ["opendata.gov.mn"] },
];

const BY_DOMAIN = new Map(TOPICS.flatMap((t) => t.domains.map((d) => [d, t] as const)));
const LOCAL = TOPICS.find((t) => t.key === "local")!;
const OTHER: Topic = { key: "other", label: "Бусад", tag: "ТӨРИЙН МЭДЭЭ", color: "text-utility-neutral-700", domains: [] };

/** Topics the AI may assign from the text (Tier 1). "local" is a place and "data" a source type, so they stay domain-based. */
export const AI_TOPIC_KEYS = TOPICS.map((t) => t.key).filter((k) => k !== "local" && k !== "data");

export function isAiTopic(v: unknown): v is string {
  return typeof v === "string" && AI_TOPIC_KEYS.includes(v);
}

/**
 * The topic a story is filed under. Aimag/district sites stay "Орон нутаг" and opendata stays
 * "Нээлттэй өгөгдөл"; otherwise the AI's reading of the text wins over the domain (gov.mn
 * publishes everything from cabinet decisions to stray-animal rules).
 */
export function topicFor(domain: string, category: SourceCategory, aiTopic?: string | null): Topic {
  const byDomain = BY_DOMAIN.get(domain) ?? (category === "local" ? LOCAL : OTHER);
  if (category === "local" || byDomain.key === "data" || !isAiTopic(aiTopic)) return byDomain;
  return TOPICS.find((t) => t.key === aiTopic) ?? byDomain;
}

/** Label above a headline: "ХОВД АЙМАГ" for local sites, the topic otherwise. */
export function storyTag(domain: string, category: SourceCategory, sourceName: string, aiTopic?: string | null): { tag: string; color: string } {
  const t = topicFor(domain, category, aiTopic);
  if (t.key === "local") return { tag: sourceName.replace(/^Нийслэл /, "").toUpperCase(), color: t.color };
  return { tag: t.tag, color: t.color };
}

export function findTopic(key: string | undefined): Topic | undefined {
  return TOPICS.find((t) => t.key === key);
}
