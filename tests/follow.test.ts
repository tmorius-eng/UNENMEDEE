import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { allAreas, constituencyAreas, parseFollows } from "@/lib/officials/follow";
import { mentionAlerts } from "@/lib/officials/follow-alerts";

describe("Миний гишүүн", () => {
  it("splits constituencies into areas", () => {
    assert.deepEqual(constituencyAreas("Дархан-Уул, Сэлэнгэ, Төв"), ["Дархан-Уул", "Сэлэнгэ", "Төв"]);
    assert.deepEqual(constituencyAreas(null), []);
    assert.deepEqual(allAreas(["Баянзүрх", null, "Сүхбаатар, Чингэлтэй", "Дорнод, Сүхбаатар, Хэнтий"]), ["Баянзүрх", "Дорнод", "Сүхбаатар", "Хэнтий", "Чингэлтэй"]);
  });

  it("parses follows defensively", () => {
    assert.deepEqual(parseFollows("[3, 3, -1, 2.5, \"x\", 7]"), [3, 7]);
    assert.deepEqual(parseFollows("not json"), []);
    assert.deepEqual(parseFollows(null), []);
  });

  it("sends one alert per subscriber, only for followed MPs", () => {
    const articles = [
      { slug: "a", title: "Б.Бейсен хуралдаанд оролцлоо", people: ["Б.Бейсен"] },
      { slug: "b", title: "Төсвийн хэлэлцүүлэг", people: ["Б.Бейсен", "Ж.Бат"] },
      { slug: "c", title: "Өөр мэдээ", people: ["Д.Дорж"] },
    ];
    const pols = [
      { id: 1, shortName: "Б.Бейсен" },
      { id: 2, shortName: "Ж.Бат" },
      { id: 3, shortName: "Д.Дорж" },
    ];
    const res = mentionAlerts(articles, pols, [
      { endpoint: "e1", follows: [1] },
      { endpoint: "e2", follows: [2, 9] },
      { endpoint: "e3", follows: [] },
      { endpoint: "e4", follows: [4] },
    ]);
    assert.deepEqual(
      res.map((r) => [r.endpoint, r.payload.title, r.payload.body, r.payload.url]),
      [
        ["e1", "👤 Б.Бейсен мэдээнд гарлаа", "Б.Бейсен хуралдаанд оролцлоо · +1 мэдээ", "/article/a"],
        ["e2", "👤 Ж.Бат мэдээнд гарлаа", "Төсвийн хэлэлцүүлэг", "/article/b"],
      ],
    );
  });
});
