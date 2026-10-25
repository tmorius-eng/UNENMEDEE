/**
 * "Миний аймаг / дүүрэг": the 21 aimags, the capital and its 9 districts. Each place lists the
 * official sites we scrape for it (SOURCE_SEEDS domains) and the parliament constituency its MPs
 * are elected in, exactly as parliament.mn names it ("Архангай, Өвөрхангай, Баянхонгор"; 2024
 * election). "Сүхбаатар" is both an aimag and a district, so places match the whole constituency
 * string, never one name in it.
 */
export type PlaceKind = "aimag" | "capital" | "district";

export interface Place {
  slug: string;
  /** "Архангай", "Улаанбаатар", "Хан-Уул". */
  name: string;
  kind: PlaceKind;
  /** Scraped official sites for this place (may be empty: Баянзүрх's site is down). */
  domains: string[];
  /** The parliament.mn constituency the place's MPs are elected in. */
  constituency: string | null;
}

const C = {
  west: "Говь-Алтай, Завхан, Ховд, Увс",
  khangai: "Архангай, Өвөрхангай, Баянхонгор",
  north: "Булган, Хөвсгөл, Орхон",
  central: "Дархан-Уул, Сэлэнгэ, Төв",
  east: "Дорнод, Сүхбаатар, Хэнтий",
  gobi: "Говьсүмбэр, Дорноговь, Дундговь, Өмнөговь",
};

const aimag = (slug: string, name: string, domain: string, constituency: string): Place => ({ slug, name, kind: "aimag", domains: [domain], constituency });
const district = (slug: string, name: string, domains: string[], constituency: string): Place => ({ slug, name, kind: "district", domains, constituency });

export const DISTRICTS: Place[] = [
  district("baganuur", "Багануур", ["bnd.ub.gov.mn"], "Багануур, Багахангай, Налайх"),
  district("bagakhangai", "Багахангай", ["bagakhangai.ub.gov.mn"], "Багануур, Багахангай, Налайх"),
  district("bayangol", "Баянгол", ["bgd.mn"], "Баянгол"),
  district("bayanzurkh", "Баянзүрх", [], "Баянзүрх"),
  district("nalaikh", "Налайх", ["nad.ub.gov.mn"], "Багануур, Багахангай, Налайх"),
  district("songinokhairkhan", "Сонгинохайрхан", ["shd.ub.gov.mn"], "Сонгинохайрхан"),
  district("sukhbaatar-duureg", "Сүхбаатар", ["sbd.gov.mn"], "Сүхбаатар, Чингэлтэй"),
  district("khan-uul", "Хан-Уул", ["khanuul.mn"], "Хан-Уул"),
  district("chingeltei", "Чингэлтэй", ["chingeltei.gov.mn"], "Сүхбаатар, Чингэлтэй"),
];

export const PLACES: Place[] = [
  {
    slug: "ulaanbaatar",
    name: "Улаанбаатар",
    kind: "capital",
    // The city's own sites plus every district's: the capital page is the whole city.
    domains: ["ulaanbaatar.mn", "niislel.khural.mn", ...DISTRICTS.flatMap((d) => d.domains)],
    constituency: null,
  },
  ...DISTRICTS,
  aimag("arkhangai", "Архангай", "arkhangai.gov.mn", C.khangai),
  aimag("bayan-olgii", "Баян-Өлгий", "bayan-olgii.gov.mn", "Баян-Өлгий"),
  aimag("bayankhongor", "Баянхонгор", "bayankhongor.gov.mn", C.khangai),
  aimag("bulgan", "Булган", "bulgan.gov.mn", C.north),
  aimag("govi-altai", "Говь-Алтай", "govi-altai.gov.mn", C.west),
  aimag("govisumber", "Говьсүмбэр", "govisumber.gov.mn", C.gobi),
  aimag("darkhan-uul", "Дархан-Уул", "darkhan.gov.mn", C.central),
  aimag("dornogovi", "Дорноговь", "dornogovi.gov.mn", C.gobi),
  aimag("dornod", "Дорнод", "dornod.gov.mn", C.east),
  aimag("dundgovi", "Дундговь", "dundgovi.gov.mn", C.gobi),
  aimag("zavkhan", "Завхан", "zavkhan.gov.mn", C.west),
  aimag("orkhon", "Орхон", "orkhon.gov.mn", C.north),
  aimag("uvurkhangai", "Өвөрхангай", "uvurkhangai.gov.mn", C.khangai),
  aimag("umnugovi", "Өмнөговь", "omnogovi.gov.mn", C.gobi),
  aimag("sukhbaatar", "Сүхбаатар", "sukhbaatar.gov.mn", C.east),
  aimag("selenge", "Сэлэнгэ", "selenge.gov.mn", C.central),
  aimag("tuv", "Төв", "tov.gov.mn", C.central),
  aimag("uvs", "Увс", "uvs.gov.mn", C.west),
  aimag("khovd", "Ховд", "khovd.gov.mn", C.west),
  aimag("khuvsgul", "Хөвсгөл", "khovsgol.gov.mn", C.north),
  aimag("khentii", "Хэнтий", "khentii.mn", C.east),
];

export function findPlace(slug: string): Place | undefined {
  return PLACES.find((p) => p.slug === slug);
}

/** "Ховд аймаг", "Хан-Уул дүүрэг", "Улаанбаатар хот". */
export function placeLabel(p: Place): string {
  return `${p.name} ${p.kind === "aimag" ? "аймаг" : p.kind === "district" ? "дүүрэг" : "хот"}`;
}

/** "Ховд аймгийн", "Хан-Уул дүүргийн", "Улаанбаатар хотын" (for "… мэдээ"). */
export function placeGenitive(p: Place): string {
  return `${p.name} ${p.kind === "aimag" ? "аймгийн" : p.kind === "district" ? "дүүргийн" : "хотын"}`;
}

/** The place a scraped local source belongs to (the capital's own sites map to the capital). */
export function placeOfDomain(domain: string): Place | undefined {
  return PLACES.find((p) => p.kind !== "capital" && p.domains.includes(domain)) ?? PLACES.find((p) => p.domains.includes(domain));
}
