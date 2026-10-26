import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { keyNumbers } from "@/lib/key-numbers";

describe("keyNumbers", () => {
  it("splits digits from units, sorts by value and shares amounts of 1 тэрбум and more", () => {
    const rows = keyNumbers(["94 тэрбум ₮", "186.2 тэрбум төгрөг", "450 сая ₮"], ["Эрчим хүчний салбарт 186.2 тэрбум төгрөгийн төсөв баталлаа.", "Засварт 94 тэрбум."]);
    assert.deepEqual(
      rows.map((r) => [r.number, r.unit, r.share !== null, r.context]),
      [
        ["186.2", "тэрбум төгрөг", true, "Эрчим хүчний салбарт 186.2 тэрбум төгрөгийн төсөв баталлаа."],
        ["94", "тэрбум ₮", true, "Засварт 94 тэрбум."],
        ["450", "сая ₮", false, null],
      ],
    );
    assert.equal(rows[0].share, "≈ 54 400₮");
  });
  it("keeps one row per value and unparsed text as it is", () => {
    const rows = keyNumbers(["12 тэрбум ₮", "12 тэрбум төгрөг", "хэдэн сая ₮"], []);
    assert.deepEqual(
      rows.map((r) => [r.number, r.unit, r.value]),
      [
        ["12", "тэрбум ₮", 12e9],
        ["хэдэн сая ₮", "", null],
      ],
    );
  });
  it("finds the context when the fact uses the other decimal mark and cuts long sentences", () => {
    const long = `Хураамж 12,5 тэрбум төгрөг ${"байна ".repeat(40)}`.trim();
    const [row] = keyNumbers(["12.5 тэрбум ₮"], [long]);
    assert.ok(row.context?.endsWith("…"));
    assert.ok(row.context!.length <= 161);
  });
  it("caps the list", () => {
    assert.equal(keyNumbers(["1 сая ₮", "2 сая ₮", "3 сая ₮", "4 сая ₮", "5 сая ₮", "6 сая ₮"], []).length, 5);
  });
});
