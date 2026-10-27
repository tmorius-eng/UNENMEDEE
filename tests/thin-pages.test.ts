import assert from "node:assert/strict";
import { test } from "node:test";

import { isThinArticle } from "../src/lib/seo";

const base = { importanceScore: 10, clusterId: null, amounts: [], sourceDomain: "gov.mn" };

test("a minor, single-source notice with no amount is thin", () => {
  assert.equal(isThinArticle(base), true);
});

test("importance, a cluster, a ₮ amount or a legal act keeps a page indexed", () => {
  assert.equal(isThinArticle({ ...base, importanceScore: 25 }), false);
  assert.equal(isThinArticle({ ...base, importanceScore: null }), false);
  assert.equal(isThinArticle({ ...base, clusterId: 4 }), false);
  assert.equal(isThinArticle({ ...base, amounts: ["2.5 тэрбум төгрөг"] }), false);
  assert.equal(isThinArticle({ ...base, sourceDomain: "legalinfo.mn" }), false);
});
