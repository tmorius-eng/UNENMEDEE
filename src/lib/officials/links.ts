import { sharedShortNames } from "./flags";

export interface PersonLink {
  name: string;
  /** The MP's profile id when the name matches exactly one active member, else null. */
  id: number | null;
}

/**
 * People named in an article (AI-extracted short names like "Ж.Алдаржавхлан") linked to the active
 * MP with that exact short name. A short name two members share never links: the text cannot say
 * which one it means (same rule as attendance and news mentions, CLAUDE.md §6d).
 */
export function linkPeople(names: string[], politicians: { id: number; shortName: string }[]): PersonLink[] {
  const shared = sharedShortNames(politicians);
  const byName = new Map(politicians.filter((p) => !shared.has(p.shortName)).map((p) => [p.shortName, p.id]));
  return names.map((name) => ({ name, id: byName.get(name.trim()) ?? null }));
}
