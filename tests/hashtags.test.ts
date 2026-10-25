import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hashtags } from "@/lib/social/hashtags";

describe("hashtags", () => {
  it("Facebook: brand, one topic tag, #Монгол", () => {
    assert.equal(hashtags("facebook", "economy"), "#ИлТодМэдээ #эдийнзасаг #Монгол");
    assert.equal(hashtags("facebook"), "#ИлТодМэдээ #өдрийнмэдээ #Монгол");
  });

  it("Threads: exactly one tag (it links only one topic)", () => {
    assert.equal(hashtags("threads", "justice"), "#хууль");
    assert.equal(hashtags("threads", "unknown"), "#мэдээ");
  });

  it("Instagram: brand, topic tags and the general set, at most ten", () => {
    const tags = hashtags("instagram", "health").split(" ");
    assert.equal(tags[0], "#ИлТодМэдээ");
    assert.ok(tags.includes("#эрүүлмэнд"));
    assert.ok(tags.length <= 10);
    assert.equal(new Set(tags).size, tags.length);
  });
});
