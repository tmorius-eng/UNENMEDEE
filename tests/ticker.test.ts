import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nextRunAt, nextRunLabel, ubMidnight } from "@/lib/ticker";

describe("status ticker helpers", () => {
  it("finds the next even UTC hour (the pipeline's cron)", () => {
    assert.equal(new Date(nextRunAt(Date.parse("2026-10-22T05:25:00Z"))).toISOString(), "2026-10-22T06:00:00.000Z");
    assert.equal(new Date(nextRunAt(Date.parse("2026-10-22T06:00:00Z"))).toISOString(), "2026-10-22T08:00:00.000Z");
    assert.equal(new Date(nextRunAt(Date.parse("2026-10-22T23:10:00Z"))).toISOString(), "2026-10-23T00:00:00.000Z");
  });

  it("labels the wait in hours and minutes", () => {
    assert.equal(nextRunLabel(Date.parse("2026-10-22T04:25:00Z")), "1 ц 35 мин");
    assert.equal(nextRunLabel(Date.parse("2026-10-22T05:20:00Z")), "40 мин");
  });

  it("returns Ulaanbaatar midnight as UTC", () => {
    // 2026-10-22 02:00 UB = 2026-10-21 18:00 UTC; that day began at 2026-10-21 16:00 UTC.
    assert.equal(new Date(ubMidnight(Date.parse("2026-10-21T18:00:00Z"))).toISOString(), "2026-10-21T16:00:00.000Z");
    assert.equal(new Date(ubMidnight(Date.parse("2026-10-21T15:59:00Z"))).toISOString(), "2026-10-20T16:00:00.000Z");
  });
});
