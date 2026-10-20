import type { ScrapeMeta } from "@/lib/types";
import { truncate } from "@/lib/text";

import type { Tier1Result } from "./schemas";

/** Max characters of article text sent to the bulk model (cost control, ~3k tokens). */
export const TIER1_MAX_CHARS = 6_000;
/** The deep model gets more context. */
export const TIER2_MAX_CHARS = 12_000;

export interface ArticleForAI {
  title: string;
  sourceName: string;
  sourceDomain: string;
  url: string;
  publishedAt: Date | null;
  text: string;
  meta?: ScrapeMeta | null;
}

/* -------------------------------------------------------------------------- */
/* TIER 1: DeepSeek bulk analyzer                                              */
/* -------------------------------------------------------------------------- */

export const TIER1_SYSTEM = `Чи бол "ИЛ ТОД" нээлттэй эхийн мэдээллийн платформын баримт шалгагч шинжээч.
Монгол Улсын төрийн байгууллагын албан ёсны мэдээ, тендер, шийдвэрийг уншаад ЗӨВХӨН JSON хэлбэрээр хариулна.

Зарчим:
- Баримт (тоо, мөнгөн дүн, огноо, хууль тогтоомж, байгууллага, хүний нэр) болон улс төрийн пи-ар, сурталчилгааг тусад нь ялга.
- Зөвхөн өгөгдсөн текстэд байгаа зүйлийг бич. Таамаглал, зохиомол тоо, нэр бүү нэм.
- Бүх текст цэвэр, ойлгомжтой, байгалийн монгол хэлээр (кирилл) бичигдэнэ.
- Хүнийг гэмт хэрэгт буруутгах бүү. Эрсдэлийг "анхаарах шаардлагатай" хэлбэрээр тодорхойл.

JSON бүтэц (түлхүүрүүд яг ийм байна):
{
  "tldr_summary": "Яг 3 өгүүлбэр, мөр бүрт нэг өгүүлбэр (\\n-ээр тусгаарла). Хурц, бодитой, залуу уншигчид ойлгомжтой.",
  "facts": ["Шалгаж болох баримт бүр тусдаа мөр: тоо, ₮ дүн, огноо, хуулийн нэр, компани/байгууллага"],
  "spin_detected": "1-2 өгүүлбэр: эх текст хэтрүүлсэн магтаал, тодорхойгүй амлалт, чухал мэдээллийг нуусан эсэх. Пи-ар байхгүй бол 'Илэрхий пи-ар илрээгүй.'",
  "neutrality_score": 0-100 (100 = бүрэн баримтад суурилсан төвийг сахисан, 0 = цэвэр сурталчилгаа),
  "entities": { "people": ["Овог.Нэр"], "orgs": ["Байгууллагын нэр"], "amounts_mnt": ["4.5 тэрбум ₮"] },
  "risk_score": 0-100,
  "risk_reason": "1 өгүүлбэр: эрсдэлийн оноог юунд үндэслэсэн"
}

risk_score тооцох заавар:
- 0-20: ердийн арга хэмжээ, уулзалт, баяр ёслол, мөнгөн дүнгүй мэдээлэл.
- 21-50: төсөв, худалдан авалт дурдсан боловч ил тод, тендерээр шийдсэн.
- 51-64: их хэмжээний төсөв, гэрээ, тодорхойгүй зарцуулалт.
- 65-100: шууд гэрээ / тендергүй худалдан авалт, тодорхойгүй эсвэл хэт өндөр зарцуулалт, ашиг сонирхлын зөрчлийн шинж, аудит/АТГ-ын шалгалт, хууль зөрчсөн гэх мэдээлэл, төрийн өмчийг хувьчлах/шилжүүлэх.`;

function formatMeta(meta?: ScrapeMeta | null): string {
  if (!meta) return "";
  const lines = [
    meta.tender_code && `Тендерийн дугаар: ${meta.tender_code}`,
    meta.budget_mnt && `Төсөвт өртөг: ${meta.budget_mnt}`,
    meta.procuring_entity && `Захиалагч: ${meta.procuring_entity}`,
    meta.dataset_org && `Өгөгдөл эзэмшигч: ${meta.dataset_org}`,
  ].filter(Boolean);
  return lines.length ? `\nСкрапераас ялгасан мэдээлэл:\n${lines.join("\n")}\n` : "";
}

function header(a: ArticleForAI): string {
  return `Эх сурвалж: ${a.sourceName} (${a.sourceDomain})
Холбоос: ${a.url}
Огноо: ${a.publishedAt ? a.publishedAt.toISOString().slice(0, 10) : "тодорхойгүй"}
Гарчиг: ${a.title}`;
}

export function tier1Messages(a: ArticleForAI) {
  return [
    { role: "system" as const, content: TIER1_SYSTEM },
    {
      role: "user" as const,
      content: `${header(a)}${formatMeta(a.meta)}\nТекст:\n"""\n${truncate(a.text, TIER1_MAX_CHARS)}\n"""\n\nДээрх JSON бүтцээр хариул.`,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* TIER 2: Grok investigative analyst (only for high-risk items)               */
/* -------------------------------------------------------------------------- */

export const TIER2_SYSTEM = `Чи бол Монголын зоригтой, хурц, гэхдээ шударга, баримтад үнэнч эрэн сурвалжлах дата сэтгүүлч.
"ИЛ ТОД" платформын уншигчдад (ихэвчлэн залуучууд) төрийн мэдээллийн ард юу байгааг ойлгуулна.

Хатуу дүрэм:
- Зөвхөн өгөгдсөн текст болон анхан шатны шинжилгээнд тулгуурла. Шинэ баримт, тоо, нэр зохиож бүү нэм.
- Хэнийг ч гэмт хэрэг үйлдсэн гэж бүү батал. Сэжиг, эрсдэлийг "тодруулах шаардлагатай", "асуулт үүсгэж байна" хэлбэрээр бич.
- Тоонуудыг хооронд нь харьцуул (нэг иргэнд ногдох, өмнөх онтой, нийт төсөвтэй гэх мэт) зөвхөн текстэд өгөгдсөн бол.
- Пи-ар, гоёчилсон үгийг хуулж хаяад цэвэр баримтыг үлдээ.
- Монгол хэлээр (кирилл), товч, ойлгомжтой Markdown.

ЗӨВХӨН JSON буцаа:
{
  "analysis_markdown": "## Гол баримт\\n...\\n\\n## Тоон задлан шинжилгээ\\n...\\n\\n## Пи-ар ба бодит байдал\\n...\\n\\n## Анхаарах эрсдэл\\n...",
  "citizen_questions": ["Иргэд, сэтгүүлчид асуух ёстой тодорхой асуулт (3-6)"]
}`;

export function tier2Messages(a: ArticleForAI, tier1: Tier1Result) {
  return [
    { role: "system" as const, content: TIER2_SYSTEM },
    {
      role: "user" as const,
      content: `${header(a)}${formatMeta(a.meta)}
Анхан шатны шинжилгээ (DeepSeek):
- Товч: ${tier1.tldr_summary}
- Баримтууд: ${tier1.facts.join("; ") || "—"}
- Пи-ар: ${tier1.spin_detected}
- Эрсдэлийн оноо: ${tier1.risk_score}/100 (${tier1.risk_reason})
- Мөнгөн дүн: ${tier1.entities.amounts_mnt.join(", ") || "—"}

Эх текст:
"""
${truncate(a.text, TIER2_MAX_CHARS)}
"""

Гүнзгий эрэн сурвалжлах дүгнэлтийг JSON-оор бич.`,
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Cluster synthesis                                                           */
/* -------------------------------------------------------------------------- */

export const CLUSTER_SYSTEM = `Чи олон эх сурвалжаас ирсэн нэг сэдвийн мэдээг нэгтгэдэг төвийг сахисан редактор.
Эх сурвалж бүр юу гэж хэлснийг харьцуулж, давхцаж буй баримт, зөрүүтэй мэдээллийг тодруул. Шинэ баримт бүү зохио.
ЗӨВХӨН JSON: { "title": "Сэдвийн товч, мэдээллийн гарчиг (монголоор)", "synthesis": "3-5 өгүүлбэр. Эх сурвалжуудын нийтлэг баримт, ялгаа, анхаарах зүйл." }`;

export interface ClusterMember {
  title: string;
  sourceName: string;
  tldr: string;
  facts: string[];
}

export function clusterMessages(members: ClusterMember[]) {
  const list = members
    .slice(0, 8)
    .map((m, i) => `${i + 1}. [${m.sourceName}] ${m.title}\n   Товч: ${m.tldr}\n   Баримт: ${m.facts.slice(0, 5).join("; ") || "—"}`)
    .join("\n\n");
  return [
    { role: "system" as const, content: CLUSTER_SYSTEM },
    { role: "user" as const, content: `Нэг сэдэвт хамаарах ${members.length} мэдээ:\n\n${list}\n\nJSON-оор нэгтгэ.` },
  ];
}
