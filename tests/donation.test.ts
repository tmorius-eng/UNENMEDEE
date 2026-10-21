import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_DONATION, groupAccount, normalizeAccount, parseDonation } from "@/lib/donation";

describe("donation account", () => {
  it("groups the IBAN for reading and normalizes pasted input", () => {
    assert.equal(groupAccount("MN110005005085293387"), "MN11 0005 0050 8529 3387");
    assert.equal(normalizeAccount(" mn11 0005 0050 8529 3387 "), "MN110005005085293387");
  });

  it("parses stored settings and falls back on anything malformed", () => {
    assert.deepEqual(parseDonation('{"bank":"Голомт банк","account":"1234 5678 90","holder":"Б.Бат"}'), { bank: "Голомт банк", account: "1234567890", holder: "Б.Бат" });
    assert.deepEqual(parseDonation('{"bank":"X","account":"MN12"}'), DEFAULT_DONATION);
    assert.deepEqual(parseDonation("not json"), DEFAULT_DONATION);
    assert.deepEqual(parseDonation(null), DEFAULT_DONATION);
  });
});
