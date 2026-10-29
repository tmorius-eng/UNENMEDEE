import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { bareName, type CompanyCheck, declaredCompanies, dueKeys, exactMatches, isOrgName, orgKey, parsePayers, parseSuppliers, searchQueries } from "@/lib/officials/companies";

const fixture = (f: string) => JSON.parse(readFileSync(`tests/fixtures/shilendans/${f}`, "utf8")) as unknown;

describe("companies named in a declaration", () => {
  it("one key for every spelling of the same company", () => {
    // М.Энхцэцэг's 2025 filing names the same lender twice: "Бодит чадал ХХК, Бодитчадал ХХК".
    assert.equal(orgKey("Бодит чадал ХХК"), orgKey("Бодитчадал ХХК"));
    assert.equal(orgKey("Эрчим хэмнэлтийн төв ХХК ХХК"), orgKey("«Эрчим хэмнэлтийн төв» ХХК"));
    assert.notEqual(orgKey("Нутгийн буян групп ХХК"), orgKey("Нутгийн буян ХХК"));
    assert.equal(bareName("«Хүчит хөтлүүр» ХХК  ХХК"), "Хүчит хөтлүүр");
    assert.deepEqual(searchQueries("Бодит чадал ХХК"), ["Бодит чадал", "Бодитчадал"]);
    assert.deepEqual(searchQueries("Бодитчадал ХХК"), ["Бодитчадал"]);
  });

  it("lists organisations once, never private people, and does not look up banks, funds or Erdenes Tavantolgoi", () => {
    const c = declaredCompanies({
      stocks: " Эрчим хэмнэлтийн төв ХХК, Эрчим хэмнэлтийн төв ХХК ХХК, Хүчит хөтлүүр ХХК  ХХК, Эрдэнэс Тавантолгой ХК, Эрдэнэс Тавантолгой ХК",
      lenders: "Викториа мужийн анхны байр худалдан авахад дэмжих сан, Австриалийн хамтын нөхөрлөлийн банк, Бодит чадал ХХК, Бодитчадал ХХК, Б.Батболд, Дорж Болд",
    });
    assert.deepEqual(
      c.stocks.map((o) => [o.name, o.lookup]),
      [
        ["Эрчим хэмнэлтийн төв ХХК", true],
        ["Хүчит хөтлүүр ХХК", true],
        ["Эрдэнэс Тавантолгой ХК", false],
      ],
    );
    assert.deepEqual(
      c.lenders.map((o) => [o.name, o.lookup]),
      [
        ["Викториа мужийн анхны байр худалдан авахад дэмжих сан", false],
        ["Австриалийн хамтын нөхөрлөлийн банк", false],
        ["Бодит чадал ХХК", true],
      ],
    );
    assert.equal(c.hiddenPeople, 2);
    assert.equal(isOrgName("Б.Батболд"), false);
    assert.equal(declaredCompanies(null).stocks.length, 0);
  });
});

describe("Шилэн данс lookups", () => {
  it("links a company only when exactly one register has its name", () => {
    // A real search for "Нутгийн буян": five suppliers contain the words, one is the company.
    const hits = parseSuppliers(fixture("supplier-search.json"));
    assert.equal(hits.length, 5);
    assert.deepEqual(
      exactMatches(hits, orgKey("Нутгийн буян групп ХХК")).map((h) => h.register),
      ["5467446"],
    );
    assert.equal(exactMatches(hits, orgKey("Нутгийн буян ХХК")).length, 0, "a shorter name is not the same company");
    const twins = [...hits, { name: "Нутгийн буян групп", register: "9999999", amount: 1, count: 1 }];
    assert.equal(exactMatches(twins, orgKey("Нутгийн буян групп ХХК")).length, 2, "two registers: ambiguous, never linked");
  });

  it("reads the state bodies that paid, largest first", () => {
    const payers = parsePayers(fixture("supplier-payers.json"), 3);
    assert.equal(payers.length, 3);
    assert.ok(payers[0].amount >= payers[1].amount && payers[1].amount >= payers[2].amount);
    assert.ok(payers.every((p) => p.name.length > 0 && p.count >= 1));
  });

  it("checks never-seen names first, then those older than 30 days", () => {
    const now = new Date("2026-10-29T00:00:00Z");
    const at = (d: string): CompanyCheck => ({ status: "none", name: "x", checkedAt: `${d}T00:00:00Z` });
    const wanted = new Map([
      ["a", "A ХХК"],
      ["b", "B ХХК"],
      ["c", "C ХХК"],
      ["d", "D ХХК"],
    ]);
    assert.deepEqual(dueKeys(wanted, { a: at("2026-10-20"), b: at("2026-08-01"), c: at("2026-09-01") }, now), ["d", "b", "c"]);
  });
});
