import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SOURCE_SEEDS } from "@/lib/sources";
import { TOPICS } from "@/lib/topics";

// A topic domain that is not a seeded source never matches anything (constcourt.mn stayed in the
// "law" topic after the court moved to conscourt.gov.mn, so its stories fell to "other").
describe("topic domains and seeded sources", () => {
  const seeds = new Set(SOURCE_SEEDS.map((s) => s.domain));

  it("every topic domain is a seeded source", () => {
    for (const t of TOPICS) for (const d of t.domains ?? []) assert.ok(seeds.has(d), `${t.key}: ${d} is not in SOURCE_SEEDS`);
  });

  it("every national source has a topic (local sites are filed by place)", () => {
    const mapped = new Set(TOPICS.flatMap((t) => t.domains ?? []));
    const missing = SOURCE_SEEDS.filter((s) => s.category !== "local" && !mapped.has(s.domain)).map((s) => s.domain);
    assert.deepEqual(missing, []);
  });
});
