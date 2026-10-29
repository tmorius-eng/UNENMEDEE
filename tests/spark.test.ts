import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { linePath, SPARK_H, SPARK_POINTS, sparkDelta, sparkPath, yearTicks } from "@/lib/spark";

describe("sparkPath", () => {
  it("needs two points and spans the box from the first to the last", () => {
    assert.equal(sparkPath([1]), null);
    const p = sparkPath([1, 3, 2])!;
    assert.equal(p.line, "0.0,20.0 50.0,2.0 100.0,11.0");
    assert.ok(p.area.startsWith(`M0,${SPARK_H} L0.0,20.0`) && p.area.endsWith(`L100,${SPARK_H} Z`));
  });
  it("draws a flat series through the middle and keeps only the newest points", () => {
    assert.equal(sparkPath([5, 5, 5])!.line, "0.0,11.0 50.0,11.0 100.0,11.0");
    const many = Array.from({ length: SPARK_POINTS + 10 }, (_, i) => i);
    assert.equal(sparkPath(many)!.line.split(" ").length, SPARK_POINTS);
  });
});

describe("sparkDelta", () => {
  it("reports percentage points or a percentage change, and = 0 when nothing moved", () => {
    assert.equal(sparkDelta([9.1, 10, 11.9], false), "▲ 2.8");
    assert.equal(sparkDelta([12.5, 12.5], false), "= 0");
    assert.equal(sparkDelta([3571, 3598], true), "▲ 0.8%");
    assert.equal(sparkDelta([4000, 3900], true), "▼ 2.5%");
    assert.equal(sparkDelta([1], true), null);
  });
});

describe("linePath / yearTicks", () => {
  it("keeps the full time axis and skips missing months without compressing time", () => {
    const p = linePath([10, null, 30, 20], 300, 80)!;
    assert.equal(p.min, 10);
    assert.equal(p.max, 30);
    assert.equal(p.line.split(" ").length, 3);
    assert.ok(p.line.startsWith("0.0,77.0 200.0,3.0"));
    assert.equal(linePath([1, null], 300, 80), null);
    assert.equal(linePath([5, 5], 300, 80)!.line, "0.0,40.0 300.0,40.0");
  });
  it("labels the first year, every fifth year and the last one, dropping a tick that would overlap an end", () => {
    const months: string[] = [];
    for (let y = 2010; y <= 2026; y++) for (let m = 1; m <= 12; m++) if (!(y === 2010 && m < 12) && !(y === 2026 && m > 9)) months.push(`${y}-${String(m).padStart(2, "0")}`);
    const ticks = yearTicks(months);
    assert.deepEqual(
      ticks.map((t) => t.label),
      ["2010", "2015", "2020", "2026"],
    );
    assert.equal(ticks[0].x, 0);
    assert.equal(ticks.at(-1)!.x, 1);
    // 2025 sits 7 % from the right end, under a "2026" label's width: dropped. A longer axis keeps it.
    const longer = [...months, ...Array.from({ length: 27 }, (_, i) => `${2026 + Math.floor((i + 9) / 12)}-${String(((i + 9) % 12) + 1).padStart(2, "0")}`)];
    assert.ok(yearTicks(longer).some((t) => t.label === "2025"));
  });
});
