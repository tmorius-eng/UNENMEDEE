import assert from "node:assert/strict";
import { test } from "node:test";

import { archiveDateLabel, dayGenitive, parseArchiveDate, recentDates, shiftDate, ubDateKey, ubDayBounds } from "../src/lib/archive";

test("parseArchiveDate accepts real days only", () => {
  assert.equal(parseArchiveDate("2026-10-26"), "2026-10-26");
  assert.equal(parseArchiveDate("2028-02-29"), "2028-02-29");
  assert.equal(parseArchiveDate("2026-02-29"), null);
  assert.equal(parseArchiveDate("2026-13-01"), null);
  assert.equal(parseArchiveDate("2026-1-5"), null);
  assert.equal(parseArchiveDate("20261026"), null);
  assert.equal(parseArchiveDate("1999-01-01"), null);
});

test("Ulaanbaatar day keys and bounds", () => {
  // 2026-10-25 16:30 UTC is 00:30 on the 26th in Ulaanbaatar.
  assert.equal(ubDateKey(Date.parse("2026-10-25T16:30:00Z")), "2026-10-26");
  assert.equal(ubDateKey(Date.parse("2026-10-25T15:59:59Z")), "2026-10-25");
  const [start, end] = ubDayBounds("2026-10-26");
  assert.equal(new Date(start).toISOString(), "2026-10-25T16:00:00.000Z");
  assert.equal(end - start, 86_400_000);
});

test("shiftDate and recentDates cross month ends", () => {
  assert.equal(shiftDate("2026-11-01", -1), "2026-10-31");
  assert.equal(shiftDate("2026-12-31", 1), "2027-01-01");
  assert.deepEqual(recentDates(Date.parse("2026-11-01T02:00:00Z"), 3), ["2026-11-01", "2026-10-31", "2026-10-30"]);
});

test("day genitive follows the number's last word", () => {
  assert.equal(dayGenitive(1), "1-ний");
  assert.equal(dayGenitive(4), "4-ний");
  assert.equal(dayGenitive(9), "9-ний");
  assert.equal(dayGenitive(21), "21-ний");
  assert.equal(dayGenitive(26), "26-ны");
  assert.equal(dayGenitive(10), "10-ны");
  assert.equal(dayGenitive(30), "30-ны");
  assert.equal(archiveDateLabel("2026-10-26"), "2026 оны 10-р сарын 26-ны");
});
