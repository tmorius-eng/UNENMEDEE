import assert from "node:assert/strict";
import { test } from "node:test";

import { breadcrumbLd, datasetLd, personLd } from "../src/lib/structured-data";

test("breadcrumbLd starts at home and numbers the trail", () => {
  const b = breadcrumbLd([{ name: "УИХ-ын гишүүд", path: "/officials" }]);
  assert.equal(b.itemListElement.length, 2);
  assert.equal(b.itemListElement[0].position, 1);
  assert.match(b.itemListElement[0].item, /\/$/);
  assert.match(b.itemListElement[1].item, /\/officials$/);
});

test("datasetLd names the official creator and source", () => {
  const d = datasetLd(
    { name: "Ханш", description: "Монголбанкны албан ханш", creator: { name: "Монголбанк", url: "https://www.mongolbank.mn" }, sourceUrl: "https://www.mongolbank.mn", temporalCoverage: "2020/.." },
    "/data",
  );
  assert.equal(d["@type"], "Dataset");
  assert.equal(d.creator.name, "Монголбанк");
  assert.equal(d.isBasedOn, "https://www.mongolbank.mn");
  assert.equal(d.temporalCoverage, "2020/..");
  assert.equal("keywords" in d, false);
});

test("personLd keeps the short name and leaves out empty fields", () => {
  const p = personLd({ id: 7, fullName: "Даваасамбуу Ганмаа", shortName: "Д.Ганмаа", party: null, photoUrl: null, profileUrl: "https://www.parliament.mn/m/7", isActive: true, constituency: null });
  assert.equal(p.alternateName, "Д.Ганмаа");
  assert.equal(p.jobTitle, "УИХ-ын гишүүн");
  assert.equal("image" in p, false);
  assert.equal("affiliation" in p, false);
  assert.equal("workLocation" in p, false);
  assert.equal(personLd({ id: 7, fullName: "A B", shortName: "A.B", party: "Нам", photoUrl: "https://x/y.jpg", profileUrl: "https://p", isActive: false, constituency: "Ховд" }).jobTitle, "УИХ-ын гишүүн асан");
});
