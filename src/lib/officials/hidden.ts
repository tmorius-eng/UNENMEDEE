import { z } from "zod";

/**
 * Declaration years an editor took out of the comparison because the filing itself is wrong (a unit
 * error the automatic check did not catch). Stored in app_settings as {"<politicianId>": [years]};
 * the profile says a year was left out and links the original filing, so nothing disappears quietly.
 */
export const HIDDEN_YEARS_KEY = "officials_hidden_years";

export type HiddenYears = Record<string, number[]>;

const Schema = z.record(z.string().regex(/^\d+$/), z.array(z.number().int().min(2000).max(2100)));

export function parseHiddenYears(value: string | null | undefined): HiddenYears {
  if (!value) return {};
  try {
    const parsed = Schema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

/** "46:2025, 12:2023" (one politician id and year per pair) → {"46": [2025], "12": [2023]}. */
export function hiddenYearsFromText(text: string): HiddenYears {
  const out: HiddenYears = {};
  for (const m of text.matchAll(/(\d+)\s*:\s*(20\d{2})/g)) {
    const list = (out[m[1]] ??= []);
    if (!list.includes(+m[2])) list.push(+m[2]);
  }
  return out;
}

export function hiddenYearsToText(hidden: HiddenYears): string {
  return Object.entries(hidden)
    .flatMap(([id, years]) => years.map((y) => `${id}:${y}`))
    .join(", ");
}
