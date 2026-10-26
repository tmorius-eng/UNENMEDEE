import { amountValue } from "@/lib/format";
import { formatShare, PER_PERSON_MIN, POPULATION } from "@/lib/per-person";

/** One row of the article's "Гол тоо" panel. */
export interface KeyNumber {
  /** The digits as extracted ("186.2"), or the whole text when it does not parse. */
  number: string;
  /** The unit words after the digits ("тэрбум ₮"), empty when unparsed. */
  unit: string;
  value: number | null;
  /** "≈ 54 400₮" per resident for amounts of 1 тэрбум and more. */
  share: string | null;
  /** The first extracted fact sentence that names this number. */
  context: string | null;
}

const NUMBER = /^(\d[\d\s,.]*)(.*)$/u;

function cut(s: string, max = 160): string {
  if (s.length <= max) return s;
  const head = s.slice(0, max);
  const space = head.lastIndexOf(" ");
  return `${(space > 80 ? head.slice(0, space) : head).replace(/[\s,;:–—-]+$/, "")}…`;
}

/**
 * The article's ₮ amounts as display rows: largest first, one row per value, at most `max`.
 * Rule-based (the amounts come from the AI's entity list and the regex merge), no new claims:
 * the per-person line is plain division by the population and the context is a fact sentence
 * that contains the same digits.
 */
export function keyNumbers(amounts: string[], facts: string[], max = 5): KeyNumber[] {
  const rows: KeyNumber[] = [];
  const seen = new Set<string>();
  for (const raw of amounts) {
    const text = raw.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const value = amountValue(text);
    const m = value !== null ? text.match(NUMBER) : null;
    const number = m ? m[1].replace(/[\s,.]+$/, "") : text;
    const unit = m?.[2]?.trim() ?? "";
    const key = value !== null ? String(value) : number.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const digits = number.replace(/\s/g, "");
    const alt = digits.includes(".") ? digits.replace(".", ",") : digits.replace(",", ".");
    const context = facts.find((f) => f.includes(digits) || f.includes(alt)) ?? null;
    rows.push({
      number,
      unit,
      value,
      share: value !== null && value >= PER_PERSON_MIN ? formatShare(value / POPULATION.count) : null,
      context: context ? cut(context) : null,
    });
  }
  rows.sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  return rows.slice(0, max);
}
