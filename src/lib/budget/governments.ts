/**
 * Prime Ministers since the 1990 democratic transition, with the PM's party. Used only to label
 * budget years ("who headed the government"), never to attribute outcomes.
 * Source: "List of prime ministers of Mongolia", Wikipedia (checked 2026-10-21); cross-check
 * against the State Great Khural resolutions when editing. Acting PMs are marked.
 */
export interface Government {
  pm: string;
  party: string;
  from: string;
  to: string | null;
  acting?: boolean;
}

/**
 * The day the list above was last checked against the source. The last entry is open-ended
 * (`to: null`), so after this date nobody has confirmed it is still true; the watchdog reminds the
 * owner 18 months later (before the 2028 election and any change of government is missed).
 */
export const GOVERNMENTS_VERIFIED_THROUGH = "2026-10-21";

export const GOVERNMENTS_SOURCE = "https://en.wikipedia.org/wiki/List_of_prime_ministers_of_Mongolia";

export const GOVERNMENTS: Government[] = [
  { pm: "Д.Содном", party: "МАХН", from: "1984-12-12", to: "1990-09-11" },
  { pm: "Д.Бямбасүрэн", party: "МАХН", from: "1990-09-11", to: "1992-07-21" },
  { pm: "П.Жасрай", party: "МАХН", from: "1992-07-21", to: "1996-07-19" },
  { pm: "М.Энхсайхан", party: "Ардчилсан холбоо эвсэл", from: "1996-07-19", to: "1998-04-23" },
  { pm: "Ц.Элбэгдорж", party: "Ардчилсан холбоо эвсэл", from: "1998-04-23", to: "1998-12-09" },
  { pm: "Ж.Наранцацралт", party: "Ардчилсан холбоо эвсэл", from: "1998-12-09", to: "1999-07-22" },
  { pm: "Н.Туяа", party: "Ардчилсан холбоо эвсэл", from: "1999-07-22", to: "1999-07-30", acting: true },
  { pm: "Р.Амаржаргал", party: "Ардчилсан холбоо эвсэл", from: "1999-07-30", to: "2000-07-26" },
  { pm: "Н.Энхбаяр", party: "МАХН", from: "2000-07-26", to: "2004-08-20" },
  { pm: "Ц.Элбэгдорж", party: "АН (эвслийн Засгийн газар)", from: "2004-08-20", to: "2006-01-13" },
  { pm: "М.Энхболд", party: "МАХН", from: "2006-01-25", to: "2007-11-22" },
  { pm: "С.Баяр", party: "МАХН", from: "2007-11-22", to: "2009-10-29" },
  { pm: "С.Батболд", party: "МАХН / МАН", from: "2009-10-29", to: "2012-08-10" },
  { pm: "Н.Алтанхуяг", party: "АН", from: "2012-08-10", to: "2014-11-05" },
  { pm: "Д.Тэрбишдагва", party: "МАХН", from: "2014-11-05", to: "2014-11-21", acting: true },
  { pm: "Ч.Сайханбилэг", party: "АН", from: "2014-11-21", to: "2016-07-07" },
  { pm: "Ж.Эрдэнэбат", party: "МАН", from: "2016-07-07", to: "2017-10-04" },
  { pm: "У.Хүрэлсүх", party: "МАН", from: "2017-10-04", to: "2021-01-27" },
  { pm: "Л.Оюун-Эрдэнэ", party: "МАН", from: "2021-01-27", to: "2025-06-13" },
  { pm: "Г.Занданшатар", party: "МАН", from: "2025-06-13", to: "2026-03-30" },
  { pm: "Н.Учрал", party: "МАН", from: "2026-03-30", to: null },
];

/** Governments that held office at any point in a calendar year (acting ones left out). */
export function governmentsInYear(year: number): Government[] {
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  return GOVERNMENTS.filter((g) => !g.acting && g.from <= end && (g.to === null || g.to >= start));
}
