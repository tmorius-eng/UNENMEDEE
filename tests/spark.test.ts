import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SPARK_H, SPARK_POINTS, sparkDelta, sparkPath } from "@/lib/spark";

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
