/**
 * Syncs members of parliament and their ХАСХОМ asset/income declarations.
 *
 *   npm run officials:sync                 # roster + declarations (≈17 min, two hosts in parallel)
 *   npm run officials:sync -- --dry-run --limit 3
 *
 * Members missing from the current roster are marked is_active = false (never deleted), so
 * after an election the new parliament simply appears. Only official numbers are stored.
 */
import "dotenv/config";
import { parseArgs } from "node:util";

import { and, eq, notInArray, sql } from "drizzle-orm";

import { closeDb, getDb, hasDatabase } from "@/db";
import { assetDeclarations, politicians } from "@/db/schema";
import { fetchMember, fetchRoster, type MemberInfo } from "@/lib/officials/parliament";
import { fetchDeclarations, searchXacxomId, xacxomPageUrl, type Declaration } from "@/lib/officials/xacxom";

const { values } = parseArgs({ options: { "dry-run": { type: "boolean", default: false }, limit: { type: "string" } } });

async function declarationsFor(m: MemberInfo): Promise<{ id: string | null; rows: Declaration[] }> {
  const id = m.xacxomId ?? (await searchXacxomId(m.lastName, m.firstName));
  if (!id) return { id: null, rows: [] };
  return { id, rows: await fetchDeclarations(id) };
}

async function main() {
  const dryRun = values["dry-run"];
  if (!dryRun && !hasDatabase()) {
    console.error("✗ DATABASE_URL is not set. Use --dry-run to test without a database.");
    process.exitCode = 1;
    return;
  }
  const roster = await fetchRoster();
  const list = values.limit ? roster.slice(0, Math.max(1, Number(values.limit))) : roster;
  console.log(`🏛️  parliament.mn: ${roster.length} members${list.length < roster.length ? ` (syncing ${list.length})` : ""}`);

  // parliament.mn and xacxom.iaac.mn are throttled per host by politeFetch, so declaration
  // requests run while the next member's detail is being fetched.
  const pending: Promise<void>[] = [];
  let ok = 0;
  let failed = 0;
  for (const base of list) {
    let member: MemberInfo;
    try {
      member = await fetchMember(base);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${base.fullName}: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    pending.push(
      declarationsFor(member)
        .then(async ({ id, rows }) => {
          const m = { ...member, xacxomId: id };
          console.log(`  ✓ ${m.shortName} (${m.party ?? "—"}): ${rows.length} declaration year(s)${id ? "" : ", no ХАСХОМ link"}`);
          if (dryRun) {
            if (rows.length) console.log(`     ${rows.map((r) => `${r.year}: income ${r.incomeOwn ?? "—"}, assets ${r.totalAssets}`).join(" | ")}`);
            ok++;
            return;
          }
          await store(m, rows);
          ok++;
        })
        .catch((err) => {
          failed++;
          console.error(`  ✗ ${member.shortName}: ${err instanceof Error ? err.message : err}`);
        }),
    );
  }
  await Promise.all(pending);

  if (!dryRun && !values.limit && roster.length > 0) {
    // Only a full, successful roster read may retire members.
    const current = roster.map((r) => r.parliamentMemberId);
    const retired = await getDb()
      .update(politicians)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(politicians.isActive, true), notInArray(politicians.parliamentMemberId, current)))
      .returning({ id: politicians.id });
    if (retired.length) console.log(`  ↺ ${retired.length} member(s) no longer in parliament marked inactive`);
  }
  console.log(`🏛️  Done: ${ok} synced, ${failed} failed.`);
  if (failed > list.length / 2) process.exitCode = 1;
}

async function store(m: MemberInfo, rows: Declaration[]) {
  const db = getDb();
  const values = {
    parliamentMemberId: m.parliamentMemberId,
    xacxomId: m.xacxomId,
    fullName: m.fullName,
    shortName: m.shortName,
    party: m.party,
    constituency: m.constituency,
    votes: m.votes,
    electionSystem: m.electionSystem,
    termStart: m.termStart,
    termEnd: m.termEnd,
    isActive: true,
    photoUrl: m.photoUrl,
    profileUrl: m.profileUrl,
    updatedAt: new Date(),
  };
  const [p] = await db
    .insert(politicians)
    .values(values)
    .onConflictDoUpdate({ target: politicians.parliamentMemberId, set: { ...values, xacxomId: sql`coalesce(excluded.xacxom_id, ${politicians.xacxomId})` } })
    .returning({ id: politicians.id });
  if (!m.xacxomId) return;
  for (const r of rows) {
    const row = { politicianId: p.id, sourceUrl: xacxomPageUrl(m.xacxomId), fetchedAt: new Date(), ...r };
    await db.insert(assetDeclarations).values(row).onConflictDoUpdate({ target: [assetDeclarations.politicianId, assetDeclarations.year], set: row });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
