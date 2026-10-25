import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findPlace, placeGenitive, placeLabel, placeOfDomain, PLACES } from "@/lib/places";
import { SOURCE_SEEDS } from "@/lib/sources";

// parliament.mn constituency names of the 2024 election, as stored in politicians.constituency.
const CONSTITUENCIES = [
  "Архангай, Өвөрхангай, Баянхонгор",
  "Багануур, Багахангай, Налайх",
  "Баян-Өлгий",
  "Баянгол",
  "Баянзүрх",
  "Булган, Хөвсгөл, Орхон",
  "Говь-Алтай, Завхан, Ховд, Увс",
  "Говьсүмбэр, Дорноговь, Дундговь, Өмнөговь",
  "Дархан-Уул, Сэлэнгэ, Төв",
  "Дорнод, Сүхбаатар, Хэнтий",
  "Сонгинохайрхан",
  "Сүхбаатар, Чингэлтэй",
  "Хан-Уул",
];

describe("places", () => {
  it("21 aimags, the capital and 9 districts, unique slugs", () => {
    assert.equal(PLACES.filter((p) => p.kind === "aimag").length, 21);
    assert.equal(PLACES.filter((p) => p.kind === "district").length, 9);
    assert.equal(new Set(PLACES.map((p) => p.slug)).size, PLACES.length);
    assert.ok(PLACES.every((p) => /^[a-z0-9-]+$/.test(p.slug)));
  });

  it("every constituency is a real parliament.mn one, and every one has a place", () => {
    for (const p of PLACES) if (p.constituency) assert.ok(CONSTITUENCIES.includes(p.constituency), `${p.slug}: ${p.constituency}`);
    for (const c of CONSTITUENCIES) assert.ok(PLACES.some((p) => p.constituency === c), c);
  });

  it("each place's name appears in its constituency (Сүхбаатар aimag vs district stay apart)", () => {
    for (const p of PLACES) if (p.constituency) assert.ok(p.constituency.split(", ").includes(p.name), p.slug);
    assert.equal(findPlace("sukhbaatar")?.constituency, "Дорнод, Сүхбаатар, Хэнтий");
    assert.equal(findPlace("sukhbaatar-duureg")?.constituency, "Сүхбаатар, Чингэлтэй");
  });

  it("every local source belongs to a place; districts map to themselves, not the capital", () => {
    for (const s of SOURCE_SEEDS.filter((x) => x.category === "local")) assert.ok(placeOfDomain(s.domain), s.domain);
    assert.equal(placeOfDomain("khanuul.mn")?.slug, "khan-uul");
    assert.equal(placeOfDomain("niislel.khural.mn")?.slug, "ulaanbaatar");
  });

  it("labels", () => {
    assert.equal(placeGenitive(findPlace("khovd")!), "Ховд аймгийн");
    assert.equal(placeGenitive(findPlace("khan-uul")!), "Хан-Уул дүүргийн");
    assert.equal(placeLabel(findPlace("ulaanbaatar")!), "Улаанбаатар хот");
  });
});
