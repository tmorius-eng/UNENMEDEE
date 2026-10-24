import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isFollowableTopic, parseTopicFollows, toggleTopicFollow } from "@/lib/topic-follow";

describe("topic follows", () => {
  it("keeps only known topics, once, in order", () => {
    assert.deepEqual(parseTopicFollows(JSON.stringify(["economy", "nope", "politics", "economy", 5])), ["economy", "politics"]);
  });
  it("survives broken storage", () => {
    assert.deepEqual(parseTopicFollows("{not json"), []);
    assert.deepEqual(parseTopicFollows(null), []);
    assert.deepEqual(parseTopicFollows('{"a":1}'), []);
  });
  it("toggles", () => {
    assert.deepEqual(toggleTopicFollow(["politics"], "economy"), ["politics", "economy"]);
    assert.deepEqual(toggleTopicFollow(["politics", "economy"], "politics"), ["economy"]);
  });
  it("knows local and data topics", () => {
    assert.ok(isFollowableTopic("local") && isFollowableTopic("data") && !isFollowableTopic("risk"));
  });
});
