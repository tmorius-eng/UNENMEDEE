/**
 * Parliamentary terms. The State Great Khural is elected every four years in June of a year
 * divisible by four (2016, 2020, 2024, 2028 …) and the new parliament sits from early July, so a
 * date belongs to the term that began on 1 July of the latest such year. Pure date arithmetic:
 * nothing to update after an election.
 */
export function termOf(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return null;
  const year = Number(m[1]);
  const base = year - (year % 4);
  return date.slice(0, 10) >= `${base}-07-01` ? base : base - 4;
}

/** "2024–2028" */
export function termLabel(term: number): string {
  return `${term}–${term + 4}`;
}
