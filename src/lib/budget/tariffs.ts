/**
 * Household electricity and water tariffs for /prices. NSO's price table has no tariff series, so
 * these rows are typed in by hand from the regulator's own decisions, each with its source link
 * and the day it was checked. A row without a `verified` date is kept for the editor and never
 * rendered: a figure reported only by a third party is not a fact of this site.
 */
export interface TariffValue {
  label: string;
  value: number;
  unit: string;
}

export interface TariffRow {
  kind: "electricity" | "water";
  /** The day the tariff took effect (ISO date). */
  from: string;
  label: string;
  values: TariffValue[];
  source: { name: string; url: string };
  /** The day a person read the source page and confirmed the numbers; null = not confirmed, hidden. */
  verified: string | null;
  note?: string;
}

/** The newest day any row was checked; the watchdog asks for a re-check 13 months later. */
export const TARIFFS_VERIFIED_THROUGH = "2026-10-29";

export const TARIFFS: TariffRow[] = [
  {
    kind: "electricity",
    from: "2024-11-15",
    label: "Айл өрхийн цахилгаан, сарын хэрэглээний шатлалаар",
    values: [
      { label: "эхний 150 кВт·ц", value: 175, unit: "₮/кВт·ц" },
      { label: "150–300 кВт·ц", value: 256, unit: "₮/кВт·ц" },
      { label: "300-аас дээш", value: 285, unit: "₮/кВт·ц" },
    ],
    source: { name: "Эрчим хүчний зохицуулах хороо", url: "https://erc.gov.mn/mn/news/921" },
    verified: "2026-10-29",
    note: "Өмнө нь айл өрхийн дундаж тариф 140 ₮/кВт·ц байсан (мөн эх сурвалж). Дундаж өрх сард 220 кВт·ц хэрэглэдэг гэж ЭХЗХ тооцсон.",
  },
  {
    kind: "water",
    from: "2023-11-01",
    label: "Орон сууцны айл өрхийн цэвэр ус (УСУГ)",
    values: [{ label: "цэвэр ус", value: 1.34, unit: "₮/л" }],
    source: { name: "Eguur.mn (УСУГ-ын мэдээлэл)", url: "https://eguur.mn/445108/" },
    verified: "2026-10-29",
    note: "Нэг литр 1.07 → 1.34 ₮ (27 мөнгөөр нэмэгдсэн). Хэвлэлийн мэдээ: УСУГ-ын тогтоолын текст олдох хүртэл «хэвлэл» гэж тэмдэглэв.",
  },
  {
    // ЭХЗХ-ны 2026 оны 5-р сарын 29-ний тогтоол (№350 эсвэл №351 гэж хэвлэлд бичсэн): 184/269/299
    // эсвэл 159/244/274 ₮/кВт·ц гэсэн хоёр өөр тоо гарсан, НӨАТ орсон эсэх нь тодорхойгүй.
    // erc.gov.mn дээрх тогтоолын текстийг уншиж баталгаажуулах хүртэл харуулахгүй.
    kind: "electricity",
    from: "2026-06-05",
    label: "Айл өрхийн цахилгаан (2026 оны шинэчлэл)",
    values: [],
    source: { name: "Эрчим хүчний зохицуулах хороо", url: "https://erc.gov.mn/mn/" },
    verified: null,
  },
];

export type VerifiedTariff = TariffRow & { verified: string };

/** Only rows a person confirmed, newest first. */
export function verifiedTariffs(rows = TARIFFS): VerifiedTariff[] {
  return rows.filter((r): r is VerifiedTariff => r.verified !== null && r.values.length > 0 && /^https:\/\//.test(r.source.url)).sort((a, b) => (a.from < b.from ? 1 : -1));
}

/** A row whose source is the regulator or a ministry, not a news site. */
export function isOfficialSource(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return /(^|\.)(gov\.mn|erc\.gov\.mn|usug\.ub\.gov\.mn|legalinfo\.mn|parliament\.mn)$/.test(host);
  } catch {
    return false;
  }
}
