import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { editionLabel, EDITION_DATE_AFTER_H } from "@/lib/edition";
import { FEED_QUIET_HOURS, hoursSince, staleAfter } from "@/lib/stale";

describe("stale data is visible", () => {
  const end = new Date("2026-10-25T12:40:00Z"); // 20:40 in Ulaanbaatar
  const later = (h: number) => new Date(end.getTime() + h * 3_600_000);

  it("an edition older than 18 h carries its date", () => {
    assert.equal(EDITION_DATE_AFTER_H, 18);
    assert.equal(editionLabel({ kind: "12h", periodEnd: end }), "ОРОЙН ТОЙМ · 20:40", "no clock: the plain label (OG cards, posts)");
    assert.equal(editionLabel({ kind: "12h", periodEnd: end }, later(17)), "ОРОЙН ТОЙМ · 20:40");
    assert.equal(editionLabel({ kind: "12h", periodEnd: end }, later(19)), "ОРОЙН ТОЙМ · 20:40 · 25.10");
    assert.equal(editionLabel({ kind: "30d", periodEnd: end }, later(400)), "САРЫН ТОЙМ");
  });

  it("staleness and quiet hours", () => {
    const now = new Date("2026-10-27T00:00:00Z");
    assert.ok(!staleAfter("2026-10-25T00:00:01Z", 2, now));
    assert.ok(staleAfter("2026-10-24T23:59:59Z", 2, now));
    assert.ok(staleAfter("not a date", 2, now), "an unreadable date is treated as stale");
    assert.equal(hoursSince("2026-10-26T17:30:00Z", now), 6);
    assert.equal(hoursSince(null, now), 0);
    assert.equal(hoursSince("2026-10-28T00:00:00Z", now), 0, "a future date is not negative");
    assert.equal(FEED_QUIET_HOURS, 6);
  });
});
