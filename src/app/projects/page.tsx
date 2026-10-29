import type { Metadata } from "next";
import { cacheLife } from "next/cache";
import Link from "next/link";

import { PageHeader } from "@/components/iltod/page-header";
import { ShareButton } from "@/components/iltod/share-button";
import { ProjectRows } from "@/components/projects/project-rows";
import { formatDateMn, formatMntShort } from "@/lib/format";
import { POPULATION_LABEL } from "@/lib/per-person";
import { officialSpent, perPerson, projectListLd, PROJECTS, PROJECTS_VERIFIED_THROUGH } from "@/lib/projects";
import { jsonLd } from "@/lib/site";

export const metadata: Metadata = {
  title: "Мега төслүүд: Шинэ Хархорум, метро, газрын тосны үйлдвэр — зарласнаас хойш хэдэн жил, хэдэн төгрөг",
  alternates: { canonical: "/projects" },
  description:
    "Шинэ Хархорум, Хүннү хот, газрын тос боловсруулах үйлдвэр, Эгийн гол, Эрдэнэбүрэн, Тавантолгойн цахилгаан станц, Улаанбаатар метро, хиймэл дагуул: албан шийдвэр нь хэзээ гарсан, төсөвт хэдэн төгрөг тавьсан, гүйцэтгэл хэд, ямар үе шатанд гэж өөрсдөө мэдэгдсэн. Бидний дүгнэлт биш, эх сурвалж бүр холбоостой.",
};

/** The clock for "N жил" lives in a daily cache entry, so the page stays static. */
async function today(): Promise<Date> {
  "use cache";
  cacheLife("days");
  return new Date();
}

export default async function ProjectsPage() {
  const now = await today();
  const spent = PROJECTS.reduce((a, p) => a + officialSpent(p), 0);
  const share = perPerson(spent);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(projectListLd()) }} />
      <PageHeader
        eyebrow="🏗 Төслүүд · албан мэдээллээр"
        title="Мега төслүүд: зарласнаас хойш хэдэн жил, хэдэн төгрөг"
        description="Шинэ хот, цахилгаан станц, үйлдвэр, метро, хиймэл дагуул: тус бүрийн албан шийдвэр хэзээ гарсан, төсөвт хэдэн төгрөг тавьсан, гүйцэтгэл гэж хэдийг мэдээлсэн, өөрсдөө ямар үе шатанд байна гэж хэлсэн. Эх сурвалж бүр холбоостой."
      >
        <ShareButton path="/projects" title="Мега төслүүд: зарласнаас хойш хэдэн жил, хэдэн төгрөг" />
      </PageHeader>

      <p className="text-sm text-secondary">
        <strong>Бидний дүгнэлт биш.</strong> Үе шатыг төрийн байгууллагын өөрийнх нь мэдэгдлээс уншина, тэр мэдэгдэл мөр бүрийн доор холбоостой; албан хуудас байхгүй газар хэвлэлийн мэдээг «хэвлэл» гэж тэмдэглэсэн. «Гүйцэтгэл» гэдэг нь төсвийн баримтад гүйцэтгэл гэж бичсэн дүн, төлөвлөгөө биш. Тоо дутуу бол
        энэ хуудсанд байхгүй гэсэн үг, тэг гэсэн үг биш. Сүүлд шалгасан: {formatDateMn(PROJECTS_VERIFIED_THROUGH)}.
      </p>

      <dl className="grid grid-cols-3 border-y border-line">
        <div className="flex flex-col border-r border-line-soft py-3 pr-3">
          <dt className="label-mono text-tertiary">Төсөл</dt>
          <dd className="num-mono text-xl text-primary">{PROJECTS.length}</dd>
        </div>
        <div className="flex flex-col border-r border-line-soft px-3 py-3">
          <dt className="label-mono text-tertiary">Албан гүйцэтгэл, нийт</dt>
          <dd className="num-mono text-xl text-primary">{formatMntShort(spent)}</dd>
          <dd className="text-xs text-tertiary">зөвхөн «гүйцэтгэл» гэж тайлагнасан мөрүүд</dd>
        </div>
        <div className="flex flex-col py-3 pl-3">
          <dt className="label-mono text-tertiary">{POPULATION_LABEL} хүнд хуваавал</dt>
          <dd className="num-mono text-xl text-primary">{share ?? "—"}</dd>
          <dd className="text-xs text-tertiary">хүн бүрд, энгийн хуваалт</dd>
        </div>
      </dl>

      <ProjectRows projects={PROJECTS} today={now} />

      <footer className="flex flex-col gap-2 text-xs text-tertiary">
        <p>
          Төслийн хуудас бүр шийдвэрийн он цагийн дараалал, жил бүрийн төсвийн мөр, албан үүрэгтэй хүмүүс, холбоотой мэдээг харуулна. Засгийн газрын 2024–2028 оны хөтөлбөрийн 14 мега төслийн эх текст{" "}
          <Link href="/promises#mega" className="font-semibold text-brand-secondary hover:underline">
            Амлалт
          </Link>{" "}
          хуудсанд бий. Дутуу, зөрүүтэй тоо харвал{" "}
          <Link href="/support" className="font-semibold text-brand-secondary hover:underline">
            бидэнд бичээрэй
          </Link>
          : эх сурвалжтай нь нэмнэ.
        </p>
      </footer>
    </div>
  );
}
