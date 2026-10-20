import { startMockLLM, TIER2_OK } from "./tests/helpers/mock-llm";
async function main() {
  const m = await startMockLLM((model, _i, body) => {
    const user = body.messages.at(-1)?.content ?? "";
    if (/Нэг сэдэвт хамаарах/.test(user)) return { content: JSON.stringify({ title: "Үл хөдлөх хөрөнгийн нээлттэй өгөгдөл", synthesis: "Улсын бүртгэлийн ерөнхий газар үл хөдлөх хөрөнгийн хэд хэдэн өгөгдлийн багц нийтэлсэн." }) };
    if (model === "mock-grok") return { content: TIER2_OK, promptTokens: 3000, completionTokens: 900 };
    const title = /Гарчиг: (.*)/.exec(user)?.[1] ?? "";
    const text = /"""\n([\s\S]{0,400})/.exec(user)?.[1] ?? "";
    return {
      content: JSON.stringify({
        tldr_summary: `${title}.\n${text.replace(/\s+/g, " ").slice(0, 160)}`,
        facts: [title.slice(0, 60)],
        spin_detected: "Илэрхий пи-ар илрээгүй.",
        neutrality_score: 70,
        entities: { people: [], orgs: /Үл хөдлөх/.test(title) ? ["Улсын бүртгэлийн ерөнхий газар"] : ["Улсын Их Хурал"], amounts_mnt: [] },
        risk_score: /Төсвийн/.test(title) ? 72 : 20,
        risk_reason: "туршилт",
      }),
      promptTokens: 2400,
      completionTokens: 420,
    };
  });
  console.log(m.baseURL);
}
main();
