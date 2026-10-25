import data from "./programme-2024.json";
import { directionGoals, isMeasurable, type Programme, type ProgrammeDirection, type ProgrammePolicy } from "./programme";

/** The imported programme (scripts/import-programme.ts). Server-only: pages render it, the client never loads it. */
export const PROGRAMME = data as Programme;

export const ALL_DIRECTIONS: { policy: ProgrammePolicy; direction: ProgrammeDirection }[] = PROGRAMME.policies.flatMap((policy) => policy.directions.map((direction) => ({ policy, direction })));

export const ALL_GOALS = ALL_DIRECTIONS.flatMap(({ direction }) => directionGoals(direction));

export const MEASURABLE_GOALS = ALL_GOALS.filter((g) => isMeasurable(g.text)).length;

export function findDirection(id: string) {
  return ALL_DIRECTIONS.find((d) => d.direction.id === id);
}
