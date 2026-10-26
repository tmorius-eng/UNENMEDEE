import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/iltod/page-header";
import { budgetConfig } from "@/lib/ai/limits";
import { DIGEST_SYSTEM, TIER1_MAX_CHARS, TIER1_SYSTEM, TIER2_MAX_CHARS, TIER2_SYSTEM } from "@/lib/ai/prompts";
import { CHANGED_BELOW, GONE_CHECKS, GONE_MIN_DAYS } from "@/lib/scraper/recheck";
import { REPO_URL, repoFile } from "@/lib/site";

export const metadata: Metadata = {
  title: "Арга зүй: AI яаж ажилладаг, эрсдэлийн оноо гэж юу вэ",
  alternates: { canonical: "/method" },
  description:
    "ИЛ ТОД МЭДЭЭ мэдээг яаж цуглуулж, AI-аар яаж шинжилдэг вэ. Эрсдэлийн оноо бол AI-ийн үнэлгээ, баримт биш. AI-д өгдөг зааврыг бүтнээр нь нийтэлсэн, эх код нээлттэй.",
};

const STEPS = [
  {
    title: "1. Цуглуулна",
    text: "95 гаруй төрийн сайтыг 2 цаг тутам уншина. robots.txt-г дагаж, нэг сайтад 8 секундээс доошгүй завсартай хандана. Зөвхөн цэвэрлэсэн текст хадгална.",
  },
  {
    title: "2. Нотолно",
    text: "Цэвэрлэсэн текст бүрийн SHA-256 хэшийг тооцож хадгална. Ижил текстийг дахин шинжлэхгүй. Нийтлэл бүр эх .gov.mn холбоостой тул хэн ч анхны хуудастай тулгаж шалгана.",
  },
  {
    title: "3. AI хураангуйлна",
    text: `Текстийн эхний ${TIER1_MAX_CHARS.toLocaleString("en-US")} тэмдэгтийг үнэгүй AI загварт өгч 3 өгүүлбэрийн хураангуй, баримт, пи-арын шинж, эрсдэлийн оноо гаргуулна. Аль загвар бичсэнийг мэдээ бүр дээр нэрлэнэ.`,
  },
  {
    title: "4. Гүнзгий шинжилнэ",
    text: `Эрсдэлийн оноо 65 ба түүнээс дээш бол ${TIER2_MAX_CHARS.toLocaleString("en-US")} тэмдэгт хүртэлх текстийг илүү хүчтэй загварт өгч, иргэд асуух ёстой асуултуудыг бичүүлнэ.`,
  },
  {
    title: "5. Тайлагнана",
    text: "AI дуудлага бүрийн токен, долларын зардлыг бүртгэж Ил тод байдлын тайланд шууд харуулна.",
  },
  {
    title: "6. Дахин шалгана",
    id: "recheck",
    text: `Сүүлийн 30 хоногийн мэдээг долоо хоног бүр эх хуудастай нь тулгана. Бидний хадгалсан өгүүлбэрийн ${Math.round(CHANGED_BELOW * 100)}%-иас бага нь хуудсанд үлдсэн эсвэл тоо өөрчлөгдсөн бол "өөрчлөгдсөн", хуудас ${GONE_CHECKS} удаа (${GONE_MIN_DAYS}+ өдрийн зайтай) нээгдэхгүй бол "устгагдсан" гэж тэмдэглэнэ. Сүлжээний алдаа хэзээ ч тооцогдохгүй.`,
  },
];

function Prompt({ id, title, text }: { id: string; title: string; text: string }) {
  return (
    <details id={id} className="group rounded-2xl bg-primary ring-1 ring-line ring-inset">
      <summary className="cursor-pointer list-none px-5 py-4 text-md font-semibold text-primary">
        <span className="mr-2 inline-block transition group-open:rotate-90" aria-hidden>
          ▸
        </span>
        {title}
      </summary>
      <pre className="overflow-x-auto border-t border-line px-5 py-4 text-xs whitespace-pre-wrap text-secondary">{text}</pre>
    </details>
  );
}

export default function MethodPage() {
  const budget = budgetConfig();
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10">
      <PageHeader
        eyebrow="🔍 Арга зүй"
        title="Бид яаж ажилладаг вэ"
        description="Энэ сайтын ард ямар ч нууц байхгүй: мэдээ цуглуулах, AI-аар шинжлэх, оноо гаргах бүх код, AI-д өгдөг заавар нээлттэй. Өөрөө шалгаж үзээрэй."
      >
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="flex w-fit items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-bg-primary transition hover:opacity-90"
        >
          Эх код GitHub дээр (MIT лиценз) ↗
        </a>
      </PageHeader>

      <section aria-labelledby="steps" className="flex flex-col gap-3">
        <h2 id="steps" className="text-lg font-semibold text-primary">
          Мэдээ нэг бүрийн зам
        </h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.title} id={"id" in s ? s.id : undefined} className="scroll-mt-24 rounded-2xl bg-primary p-5 ring-1 ring-line ring-inset">
              <p className="font-semibold text-primary">{s.title}</p>
              <p className="mt-1 text-sm text-tertiary">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="risk" aria-labelledby="risk-title" className="flex scroll-mt-24 flex-col gap-3 rounded-3xl bg-signal-soft p-6 ring-1 ring-line ring-inset">
        <h2 id="risk-title" className="text-lg font-semibold text-primary">
          Эрсдэлийн оноо: AI-ийн үнэлгээ, баримт биш
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-secondary">
          <li>
            0–100 оноог <strong>AI загвар</strong> мэдээний текстийг уншаад доорх зааврын дагуу өгдөг. Хүн шалгаагүй, AI алдаа гаргаж, тоо зохиож болно.
          </li>
          <li>Оноо нь хэнийг ч буруутгаж байгаа хэрэг биш. Энэ мэдээг илүү анхааралтай унших, эх сурвалжаас нь тулгаж шалгах дохио юм.</li>
          <li>
            65-аас дээш оноог &quot;өндөр&quot; гэж тэмдэглэх босгыг AI биш, манай код тогтоодог. AI-д хүнийг гэмт хэрэгт буруутгахыг хориглосон.
          </li>
          <li>
            Шийдвэр гаргахын өмнө мэдээ бүрийн доорх <strong>&quot;Эх сурвалж руу очих&quot;</strong> холбоосоор албан ёсны эх текстийг уншаарай.
          </li>
        </ul>
      </section>

      <section aria-labelledby="prompts" className="flex flex-col gap-3">
        <h2 id="prompts" className="text-lg font-semibold text-primary">
          AI-д өгдөг заавар (бүтнээр)
        </h2>
        <p className="text-sm text-tertiary">
          Доорх текстийг сайт ажиллаж байгаа кодоос шууд авч харуулж байна, тусад нь засаагүй.{" "}
          <a className="font-semibold text-brand-secondary hover:underline" href={repoFile("src/lib/ai/prompts.ts")} target="_blank" rel="noreferrer">
            prompts.ts ↗
          </a>
        </p>
        <Prompt id="prompt-tier1" title="Хураангуй, баримт, эрсдэлийн оноо (мэдээ бүрт)" text={TIER1_SYSTEM} />
        <Prompt id="prompt-tier2" title="Гүнзгий шинжилгээ (оноо 65+)" text={TIER2_SYSTEM} />
        <Prompt id="prompt-digest" title="Онцлох тойм (өдөрт 2 удаа)" text={DIGEST_SYSTEM} />
      </section>

      <section aria-labelledby="keys" className="flex flex-col gap-3">
        <h2 id="keys" className="text-lg font-semibold text-primary">
          AI түлхүүр, зардал
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-secondary">
          <li>AI үйлчилгээний түлхүүрүүд кодонд байхгүй. Зөвхөн GitHub Actions-ийн нууц тохиргоо болон Vercel-ийн орчны хувьсагчид хадгалагдана.</li>
          <li>Эхлээд үнэгүй AI-уудыг ашиглана. Төлбөртэй AI сард ${budget.monthlyUsd}, өдөрт ${budget.dailyUsd}-оос хэтэрвэл автоматаар зогсоно.</li>
          <li>
            Зарцуулсан цент бүр{" "}
            <Link className="font-semibold text-brand-secondary hover:underline" href="/transparency">
              Ил тод байдлын тайланд
            </Link>{" "}
            харагдана.
          </li>
          <li>
            Аюулгүй байдлын асуудал олвол{" "}
            <a className="font-semibold text-brand-secondary hover:underline" href={repoFile("SECURITY.md")} target="_blank" rel="noreferrer">
              SECURITY.md
            </a>{" "}
            дагуу нууцаар мэдэгдээрэй.
          </li>
          <li>
            Манай AI хураангуй, тойм, тооцоолсон өгөгдлийг{" "}
            <a className="font-semibold text-brand-secondary hover:underline" href={repoFile("LICENSE-CONTENT.md")} target="_blank" rel="noreferrer license">
              CC BY 4.0
            </a>{" "}
            нөхцөлөөр чөлөөтэй ашиглаж болно: эх сурвалжаа iltodmedee.mn гэж холбоостой дурдана уу. Код нь MIT лицензтэй.
          </li>
        </ul>
      </section>
    </div>
  );
}
