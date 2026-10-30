/**
 * Whole numbers as spoken Mongolian, for the video narration (src/lib/video): the text-to-speech
 * model is handed words, never digits, so "31 210" can only be read as "гучин нэгэн мянга хоёр
 * зуун арван". Every number in our narration is followed by a unit (төгрөг, хувь, жил, кило), so
 * the last word takes its attributive form ("таван жил", "мянган төгрөг"); inside a number every
 * word is attributive except a scale word that more digits follow ("дөрвөн мянга долоон зуун").
 */

const UNITS_NOM = ["", "нэг", "хоёр", "гурав", "дөрөв", "тав", "зургаа", "долоо", "найм", "ес"];
const UNITS_ATTR = ["", "нэг", "хоёр", "гурван", "дөрвөн", "таван", "зургаан", "долоон", "найман", "есөн"];
const TENS_NOM = ["", "арав", "хорь", "гуч", "дөч", "тавь", "жар", "дал", "ная", "ер"];
const TENS_ATTR = ["", "арван", "хорин", "гучин", "дөчин", "тавин", "жаран", "далан", "наян", "ерэн"];
/** Scale words: [nominative, attributive]. сая and тэрбум do not change. */
const SCALES: [string, string][] = [
  ["", ""],
  ["мянга", "мянган"],
  ["сая", "сая"],
  ["тэрбум", "тэрбум"],
];

export type NumberForm = "attributive" | "nominative";

/** Words for 1–999. `attr` = the last word is followed by something (a scale word or the unit). */
function chunk(n: number, attr: boolean): string[] {
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  const out: string[] = [];
  if (h > 0) {
    // "зуу" alone for 100–199 ("зуун таван кило"), "хоёр зуу", "гурван зуу"...
    if (h > 1) out.push(UNITS_ATTR[h]);
    out.push(t || u || attr ? "зуун" : "зуу");
  }
  if (t > 0) out.push(u || attr ? TENS_ATTR[t] : TENS_NOM[t]);
  if (u > 0) {
    // After tens the one is "нэгэн" ("гучин нэгэн мянга"); alone it stays "нэг" ("нэг кило").
    if (u === 1) out.push(t > 0 ? "нэгэн" : "нэг");
    else out.push(attr ? UNITS_ATTR[u] : UNITS_NOM[u]);
  }
  return out;
}

/**
 * 0 ≤ n < 10^12 as words. `form` is the form of the last word: attributive before a unit
 * ("дөрвөн мянга долоон зуун жаран төгрөг"), nominative when the number stands alone.
 */
export function numberWords(n: number, form: NumberForm = "attributive"): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1e12) throw new RangeError(`numberWords: ${n}`);
  if (n === 0) return "тэг";
  const groups: number[] = [];
  for (let rest = n; rest > 0; rest = Math.floor(rest / 1000)) groups.push(rest % 1000);
  const words: string[] = [];
  for (let g = groups.length - 1; g >= 0; g--) {
    const value = groups[g];
    if (value === 0) continue;
    const lower = groups.slice(0, g).some((v) => v > 0);
    const last = !lower;
    if (g === 0) {
      words.push(...chunk(value, form === "attributive"));
      continue;
    }
    // "мянга" alone for 1 000 ("мянган төгрөг"), "нэг сая", "нэг тэрбум".
    if (!(g === 1 && value === 1)) words.push(...chunk(value, true));
    const [nom, attr] = SCALES[g];
    words.push(last && form === "attributive" ? attr : nom);
  }
  return words.join(" ");
}

/** How a multiple is said and captioned: 6.56 → "бараг долоо дахин" / "Бараг 7 дахин". */
export function timesPhrase(ratio: number): { say: string; caption: string } {
  const whole = Math.floor(ratio);
  const frac = ratio - whole;
  if (frac >= 0.75) return { say: `бараг ${numberWords(whole + 1, "nominative")} дахин`, caption: `бараг ${whole + 1} дахин` };
  if (frac < 0.25) return { say: `${numberWords(whole, "nominative")} дахин`, caption: `${whole} дахин` };
  return { say: `${numberWords(whole, "nominative")} гаруй дахин`, caption: `${whole} гаруй дахин` };
}
