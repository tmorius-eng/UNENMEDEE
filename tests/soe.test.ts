import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { parseSoeReport } from "@/lib/soe/shilendans";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/soe-report.json", import.meta.url), "utf8")) as unknown;

describe("state-owned companies (Шилэн данс form 2480)", () => {
  const list = parseSoeReport(fixture);

  it("folds one row per line into one record per organisation", () => {
    assert.equal(list.length, 5);
    const ot = list.find((c) => c.name === "Эрдэнэс оюу толгой")!;
    assert.deepEqual(ot, { name: "Эрдэнэс оюу толгой", registerNo: "5548721", kind: "company", governor: null, city: "Улаанбаатар", debt: 13000000000, staff: 26, revenue: 380000000, expenses: 3520615419, wageFund: 2105074266 });
  });

  it("keeps nulls as null (no \"null\" strings) and tells enterprises from companies", () => {
    const branch = list.find((c) => c.name.endsWith("шатахуун хангалтын алба"))!;
    assert.equal(branch.registerNo, null);
    assert.equal(branch.kind, "enterprise");
    assert.equal(branch.governor, "Зам, тээврийн хөгжлийн сайд");
  });

  it("drops organisations that reported neither revenue nor expenses", () => {
    assert.ok(list.every((c) => (c.revenue ?? 0) > 0 || (c.expenses ?? 0) > 0));
    assert.deepEqual(parseSoeReport([{ name: "X", line: 12, D: "5" }]), []);
  });
});
