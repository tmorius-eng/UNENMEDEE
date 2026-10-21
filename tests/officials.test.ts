import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { declarationFlags } from "@/lib/officials/flags";
import { parseMemberDetail, parseRoster, xacxomIdFromUrl } from "@/lib/officials/parliament";
import { parseDeclarations } from "@/lib/officials/xacxom";

const json = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), "utf8")) as unknown;

describe("parliament.mn roster", () => {
  const roster = parseRoster(json("parliament-members.json"));
  it("reads members, party and the parliament term", () => {
    assert.equal(roster.length, 3);
    const m = roster[0];
    assert.equal(m.parliamentMemberId, 2);
    assert.equal(m.fullName, "Жуков Алдаржавхлан");
    assert.equal(m.shortName, "Ж.Алдаржавхлан");
    assert.equal(m.party, "Монгол Ардын нам");
    assert.equal(m.termStart, "2024-07-02");
    assert.equal(m.termEnd, "2028-08-02");
    assert.equal(m.profileUrl, "https://parliament.mn/member/2");
  });

  it("links the member to ХАСХОМ and the latest election", () => {
    const d = parseMemberDetail(json("parliament-member-detail.json"), roster[0]);
    assert.equal(d.xacxomId, "5846381");
    assert.equal(d.constituency, "Хан-Уул");
    assert.equal(d.votes, 40915);
    assert.equal(d.electionSystem, "MAJORITARIAN");
    assert.equal(xacxomIdFromUrl(null), null);
  });
});

describe("ХАСХОМ declarations", () => {
  const rows = parseDeclarations(json("xacxom-declarations.json"));
  it("converts thousand ₮ to ₮ and keeps one row per year", () => {
    assert.deepEqual(rows.map((r) => r.year), [2021, 2022, 2023, 2024, 2025]);
    const y21 = rows[0];
    assert.equal(y21.incomeOwn, 104_700_320);
    assert.equal(y21.buildingsValue, 120_000_000);
    assert.equal(y21.positionName, "ИТХ ын төлөөлөгч");
    assert.equal(y21.totalAssets, 120_000_000 + 29_000_000 + 2_000_000 + 56_453_450);
    assert.match(y21.details.transports ?? "", /X-Trail/);
  });
});

describe("neutral declaration flags", () => {
  const base = { incomeOwn: 100_000_000, incomeFamily: 0, loans: 0 };
  it("flags a >50% asset jump, loans above income and a missing year", () => {
    const flags = declarationFlags([
      { year: 2021, totalAssets: 100_000_000, ...base },
      { year: 2022, totalAssets: 200_000_000, ...base },
      { year: 2024, totalAssets: 210_000_000, ...base, loans: 300_000_000 },
    ]);
    assert.deepEqual(flags.map((f) => [f.year, f.kind]).sort(), [
      [2022, "asset_jump"],
      [2023, "missing_year"],
      [2024, "loans_over_income"],
    ]);
    assert.ok(flags.every((f) => !/хулгай|авлига|буруу/i.test(f.text)), "flags state numbers, never accusations");
  });

  it("ignores jumps on very small totals", () => {
    assert.equal(declarationFlags([{ year: 2021, totalAssets: 1_000_000, ...base }, { year: 2022, totalAssets: 10_000_000, ...base }]).length, 0);
  });
});
