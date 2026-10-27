import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseTrail, rowId, trailPosition } from "@/lib/digest-trail";

const trail = {
  edition: 42,
  items: [
    { id: 1, slug: "a", headline: "Нэг" },
    { id: 2, slug: "b", headline: "Хоёр" },
    { id: 3, slug: "c", headline: "Гурав" },
  ],
};

describe("digest trail (article bar)", () => {
  it("round-trips and rejects junk", () => {
    assert.deepEqual(parseTrail(JSON.stringify(trail)), trail);
    assert.equal(parseTrail(null), null);
    assert.equal(parseTrail("{broken"), null);
    assert.equal(parseTrail(JSON.stringify({ edition: "42", items: [] })), null);
    assert.equal(parseTrail(JSON.stringify({ edition: 42, items: [] })), null, "an empty edition shows no bar");
    // A malformed entry is dropped, the rest is kept.
    assert.deepEqual(parseTrail(JSON.stringify({ edition: 42, items: [{ id: "x" }, trail.items[0]] }))?.items, [trail.items[0]]);
  });

  it("places the article in its edition", () => {
    const first = trailPosition(trail, "a");
    assert.deepEqual([first?.n, first?.total, first?.next?.slug, first?.backHref], [1, 3, "b", "/digest#d42-1"]);
    const last = trailPosition(trail, "c");
    assert.deepEqual([last?.n, last?.next, last?.backHref], [3, null, "/digest#d42-3"]);
    assert.equal(trailPosition(trail, "not-in-digest"), null, "an article reached another way shows no bar");
    assert.equal(trailPosition(null, "a"), null);
  });

  it("row ids match the /digest anchors", () => {
    assert.equal(rowId(42, 3), "d42-3");
  });
});
