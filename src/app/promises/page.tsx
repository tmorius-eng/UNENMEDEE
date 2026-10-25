import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/iltod/page-header";
import { ShareButton } from "@/components/iltod/share-button";
import { GOVERNMENTS } from "@/lib/budget/governments";
import { formatDateMn } from "@/lib/format";
import { ALL_GOALS, MEASURABLE_GOALS, PROGRAMME } from "@/lib/promises";
import { directionGoals, directionSlug } from "@/lib/promises/programme";
import { absoluteUrl, jsonLd, SITE_NAME } from "@/lib/site";

const TITLE = "Засгийн газрын амлалт: 2024–2028 оны хөтөлбөрийн 620 зорилт";
const DESCRIPTION = `Засгийн газрын 2024–2028 оны үйл ажиллагааны хөтөлбөрийн ${ALL_GOALS.length} зорилт, 14 мега төсөл: УИХ-ын 2024 оны 21 дүгээр тогтоолоор батлагдсан эх текстээр, чиглэл тус бүрээр.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/promises" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/promises" },
};

/** Prime Ministers who have led the government since the programme was approved (labels only). */
function governmentsSince(date: string) {
  return GOVERNMENTS.filter((g) => g.to === null || g.to > date);
}

function Facts() {
  const facts = [
    { value: ALL_GOALS.length, label: "зорилт" },
    { value: MEASURABLE_GOALS, label: "нь тоон хэмжүүртэй" },
    { value: PROGRAMME.megaProjects.length, label: "мега төсөл" },
    { value: PROGRAMME.policies.reduce((n, p) => n + p.directions.length, 0), label: "чиглэл" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {facts.map((f) => (
        <div key={f.label} className="rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset">
          <dt className="sr-only">{f.label}</dt>
          <dd className="text-display-xs font-semibold text-primary tabular-nums">{f.value}</dd>
          <dd className="text-sm text-tertiary">{f.label}</dd>
        </div>
      ))}
    </dl>
  );
}

function PromisesJsonLd() {
  const url = absoluteUrl("/promises");
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": `${url}#page`, url, name: TITLE, description: DESCRIPTION, inLanguage: "mn", isPartOf: { "@id": `${absoluteUrl("/")}#website` }, isBasedOn: PROGRAMME.sourceUrl },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Амлалт", item: url },
        ],
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}

export default function PromisesPage() {
  const pms = governmentsSince(PROGRAMME.approved);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <PromisesJsonLd />
      <PageHeader
        eyebrow="📜 Амлалт"
        title="Засгийн газар юу хийнэ гэж амласан бэ?"
        description={
          <>
            {PROGRAMME.title}: {PROGRAMME.act} ({formatDateMn(new Date(`${PROGRAMME.approved}T00:00:00+08:00`))}). Зорилт бүрийг эх текстээр нь, хөтөлбөрийн өөрийн дугаарлалтаар харуулав.
          </>
        }
      >
        <ShareButton path="/promises" title={TITLE} className="w-fit" />
      </PageHeader>

      <Facts />

      <aside className="flex flex-col gap-2 rounded-2xl bg-secondary p-4 text-sm text-secondary ring-1 ring-secondary ring-inset">
        <p>
          <span className="font-semibold text-primary">Хэрэгжилтийг бид дүгнэдэггүй.</span> Энд зөвхөн батлагдсан текст байна; AI ямар нэг зорилтыг «биелсэн», «биелээгүй» гэж үнэлэхгүй. Хэрэгжилтийн албан тайланг холбоосоор нь нэмнэ.
        </p>
        <p>
          Хөтөлбөр батлагдсанаас хойш Засгийн газрыг {pms.map((g) => g.pm).join(", ")} тэргүүлсэн. Хөтөлбөрт өөрчлөлт орсон эсэхийг{" "}
          <a href={PROGRAMME.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-secondary hover:underline">
            legalinfo.mn
          </a>{" "}
          дээрх эх тогтоолоос шалгана уу. «Тоон хэмжүүртэй» гэдэг нь зорилтын текстэд нэгжтэй тоо (МВт, км, хувь, тонн…) байгааг л хэлнэ.
        </p>
      </aside>

      <section aria-labelledby="mega" className="flex flex-col gap-3">
        <h2 id="mega" className="text-lg font-semibold text-primary">
          14 мега төсөл
        </h2>
        <ol className="flex flex-col gap-2">
          {PROGRAMME.megaProjects.map((m, i) => {
            const [first, ...rest] = m.split(/(?<=\.)\s+/);
            return (
              <li key={i} className="rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset">
                <details>
                  <summary className="cursor-pointer font-semibold text-primary">
                    <span className="mr-2 text-tertiary tabular-nums">{i + 1}.</span>
                    {first}
                  </summary>
                  {rest.length > 0 && <p className="mt-2 text-sm text-secondary">{rest.join(" ")}</p>}
                </details>
              </li>
            );
          })}
        </ol>
      </section>

      {PROGRAMME.policies.map((p) => (
        <section key={p.n} aria-labelledby={`policy-${p.n}`} className="flex flex-col gap-3">
          <h2 id={`policy-${p.n}`} className="text-lg font-semibold text-primary">
            {p.n}. {p.title}
          </h2>
          {p.intro && <p className="text-sm text-tertiary">{p.intro}</p>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {p.directions.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/promises/${directionSlug(d.id)}`}
                  prefetch={false}
                  className="flex h-full flex-col gap-1 rounded-2xl bg-primary p-4 ring-1 ring-secondary transition ring-inset hover:bg-primary_hover"
                >
                  <span className="text-xs font-semibold text-tertiary tabular-nums">{d.id}</span>
                  <span className="font-semibold text-balance text-primary">{d.title}</span>
                  <span className="text-sm text-tertiary">{directionGoals(d).length} зорилт →</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <p className="text-xs text-tertiary">
        Эх сурвалж:{" "}
        <a href={PROGRAMME.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary">
          {PROGRAMME.act}
        </a>{" "}
        (
        <a href={PROGRAMME.fileUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-secondary">
          Word файл
        </a>
        ), {PROGRAMME.importedAt}-нд татсан.
      </p>
    </div>
  );
}
