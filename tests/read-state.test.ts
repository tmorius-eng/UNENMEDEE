import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addIds, bumpStreak, currentStreak, parseIds, parseStreak, ubDay } from "@/lib/read-state";

describe("reading progress", () => {
  it("adds read ids without duplicates", () => {
    assert.deepEqual([...parseIds(addIds("[1,2]", [2, 3]))], [1, 2, 3]);
    assert.deepEqual([...parseIds("garbage")], []);
  });

  it("uses the Ulaanbaatar day", () => {
    assert.equal(ubDay(Date.parse("2026-10-21T17:30:00Z")), "2026-10-22");
    assert.equal(ubDay(Date.parse("2026-10-21T15:59:00Z")), "2026-10-21");
  });

  it("counts consecutive days", () => {
    let s = bumpStreak(null, "2026-10-20");
    assert.deepEqual(s, { d: "2026-10-20", n: 1 });
    s = bumpStreak(s, "2026-10-21");
    assert.deepEqual(s, { d: "2026-10-21", n: 2 });
    assert.deepEqual(bumpStreak(s, "2026-10-21"), s, "twice the same day");
    assert.deepEqual(bumpStreak(s, "2026-10-23"), { d: "2026-10-23", n: 1 }, "a missed day restarts");
    assert.deepEqual(bumpStreak({ d: "2026-02-28", n: 4 }, "2026-03-01"), { d: "2026-03-01", n: 5 }, "month boundary");
    // The same edition, finished yesterday and open again today, is not a new day of reading.
    const counted = bumpStreak({ d: "2026-10-20", n: 2, e: 9 }, "2026-10-21", 9);
    assert.deepEqual(counted, { d: "2026-10-20", n: 2, e: 9 });
    assert.deepEqual(bumpStreak({ d: "2026-10-20", n: 2, e: 9 }, "2026-10-21", 10), { d: "2026-10-21", n: 3, e: 10 });
    assert.deepEqual(parseStreak('{"d":"2026-10-21","n":2,"e":7}'), { d: "2026-10-21", n: 2, e: 7 });
  });

  it("shows the streak only while it is alive", () => {
    assert.equal(currentStreak({ d: "2026-10-20", n: 3 }, "2026-10-21"), 3);
    assert.equal(currentStreak({ d: "2026-10-19", n: 3 }, "2026-10-21"), 0);
    assert.equal(currentStreak(parseStreak("bad"), "2026-10-21"), 0);
    assert.deepEqual(parseStreak('{"d":"2026-10-21","n":2}'), { d: "2026-10-21", n: 2 });
  });
});
