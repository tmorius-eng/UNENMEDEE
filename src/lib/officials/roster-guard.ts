/**
 * When a roster read may retire members. parliament.mn has 126 seats; a partial answer (a paged
 * or truncated list, an outage page that still parses) used to mark everyone missing from it
 * inactive, which empties /officials, every place's MP box and every follow until the next
 * full read. A roster is trusted when it has at least 100 members and at least 80 % of the
 * members active now (an election replaces many members but never shrinks the parliament).
 */
export const MIN_ROSTER = 100;
export const MIN_ROSTER_SHARE = 0.8;

export function mayRetire(rosterLength: number, activeNow: number): boolean {
  return rosterLength >= Math.max(MIN_ROSTER, Math.ceil(activeNow * MIN_ROSTER_SHARE));
}

/** More than half the detail pages without an election result: parliament.mn's API changed. */
export function detailsDegraded(total: number, withoutElection: number): boolean {
  return total > 0 && withoutElection > total / 2;
}
