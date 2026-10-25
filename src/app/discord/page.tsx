import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/iltod/page-header";
import { ShareButton } from "@/components/iltod/share-button";
import { absoluteUrl, DISCORD, jsonLd, SITE_NAME } from "@/lib/site";
import { cx } from "@/utils/cx";

const TITLE = "ИЛ ТОД МЭДЭЭ Discord дээр: тойм, өдрийн асуулт, /toim командууд";
const DESCRIPTION =
  "Өглөө, оройн тойм, чухал мэдээ, өдрийн асуулт, 7 хоногийн ТОП-ийг Discord-оор ав. Server-тээ Follow дараад мэдээ авах, эсвэл /toim, /haih, /aimag командыг хаана ч ашиглах.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/discord" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/discord" },
};

const POSTS = [
  { icon: "🗞", title: "Өглөө, оройн тойм", text: "12 цагийн хамгийн чухал мэдээ, яагаад чухал вэ гэдэгтэй нь. Өдөрт 2 удаа." },
  { icon: "⚡", title: "Чухал мэдээ", text: "Өндөр ач холбогдолтой мэдээ гармагц: 2 мөр товч, ₮ дүн, хүн бүрт хуваавал хэд болох." },
  { icon: "🧠", title: "Өдрийн асуулт", text: "Мэдээний гарчигт гарсан бодит тоогоор \"хэдэн ₮ вэ?\" poll. Хариулт нь spoiler дотор, эх мэдээтэй." },
  { icon: "📊", title: "7 хоногийн ТОП", text: "Даваа гариг бүр: хамгийн том дүн, хамгийн их ярьсан сэдэв, шинэ хууль, нийт тоо." },
];

const COMMANDS = [
  { cmd: "/toim", example: "/toim", text: "Сүүлийн тойм: 5 гол мэдээ, холбоостой." },
  { cmd: "/haih", example: "/haih ug: төсөв", text: "Төрийн мэдээнээс хайна. Кириллээр бичвэл илүү сайн олно." },
  { cmd: "/aimag", example: "/aimag ner: Ховд", text: "Аймаг, дүүргийн сүүлийн мэдээ. Нэрээ бичиж эхлэхэд өөрөө нөхнө." },
];

const FAQ = [
  { q: "Үнэгүй юу?", a: "Тийм, бүрэн үнэгүй, сурталчилгаагүй." },
  { q: "Бот миний мессежийг уншдаг уу?", a: "Үгүй. Бот зөвхөн манай сувагт нийтэлж, та командыг дуудахад л хариулна. Командад бичсэн үгийг бид хадгалдаггүй." },
  { q: "Хүмүүсийг @everyone гэж дууддаг уу?", a: "Хэзээ ч үгүй: ботын мессеж хэнийг ч tag хийдэггүй." },
  { q: "Мэдээ хаанаас ирдэг вэ?", a: "Зөвхөн төрийн албан ёсны 90 гаруй сайтаас. Товчлолыг AI бичдэг тул мэдээ бүр эх сайтын холбоостой, эрсдэлийн оноо нь «AI-ийн үнэлгээ, буруутгал биш»." },
];

function Cta({ href, label, sub, primary }: { href: string | null; label: string; sub: string; primary?: boolean }) {
  const cls = cx(
    "flex flex-col gap-1 rounded-2xl p-4 ring-1 ring-inset transition",
    href ? (primary ? "bg-brand-solid text-white ring-transparent hover:bg-brand-solid_hover" : "bg-primary text-primary ring-secondary hover:bg-primary_hover") : "bg-secondary text-tertiary ring-secondary",
  );
  const body = (
    <>
      <span className="text-md font-semibold">{label}</span>
      <span className={cx("text-sm", href && primary ? "text-white/80" : "text-tertiary")}>{href ? sub : "Холбоос удахгүй нэмэгдэнэ"}</span>
    </>
  );
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {body}
    </a>
  ) : (
    <div aria-disabled className={cls}>
      {body}
    </div>
  );
}

export default function DiscordPage() {
  const url = absoluteUrl("/discord");
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Discord", item: url },
    ],
  };
  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb) }} />
      <PageHeader
        eyebrow="🎮 Discord"
        title="Мэдээгээ Discord дээрээ ав"
        description="Урт мэдээ уншихгүй, гол санааг нь л мэдмээр байна уу? ИЛ ТОД МЭДЭЭ-ийн бот өглөө, оройн тойм, чухал мэдээ, өдрийн асуулт, 7 хоногийн ТОП-ийг Discord руу чинь шууд хүргэнэ. Бүгд эх сурвалжийн холбоостой."
      >
        <ShareButton path="/discord" title="ИЛ ТОД МЭДЭЭ Discord дээр" className="w-fit" />
      </PageHeader>

      <div className="flex flex-col gap-10">
        <section aria-label="Нэгдэх" className="grid gap-3 sm:grid-cols-2">
          <Cta href={DISCORD.invite} primary label="📢 Мэдээний сувагт нэгдэх" sub="Server-т орж мэдээгээ шууд аваарай" />
          <Cta href={DISCORD.install} label="⌨️ Командыг өөртөө нэмэх" sub="/toim, /haih, /aimag: ямар ч server, DM дээр" />
        </section>

        <section aria-labelledby="posts" className="flex flex-col gap-3">
          <h2 id="posts" className="text-lg font-semibold text-primary">
            Юу ирэх вэ?
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {POSTS.map((p) => (
              <li key={p.title} className="flex gap-3 rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset">
                <span aria-hidden className="text-2xl">
                  {p.icon}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-semibold text-primary">{p.title}</p>
                  <p className="text-sm text-tertiary">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="follow" className="flex flex-col gap-3">
          <h2 id="follow" className="text-lg font-semibold text-primary">
            Өөрийн server-т мэдээ авах (Follow)
          </h2>
          <p className="text-sm text-secondary">Server-ийн админ бол бот суулгах шаардлагагүй: манай сувгийг дагахад мэдээ таны сонгосон сувагт өөрөө орж ирнэ.</p>
          <ol className="flex flex-col gap-2 text-sm text-secondary">
            <li>
              <span className="font-semibold text-primary">1.</span> Манай server-т нэгдээд <span className="font-semibold">#мэдээ</span> сувгийг нээнэ.
            </li>
            <li>
              <span className="font-semibold text-primary">2.</span> Сувгийн дээд хэсгийн <span className="font-semibold">Follow</span> товчийг дарна.
            </li>
            <li>
              <span className="font-semibold text-primary">3.</span> Өөрийн server, сувгаа сонгоод <span className="font-semibold">Follow</span> дарна. Боллоо 🎉
            </li>
          </ol>
        </section>

        <section aria-labelledby="commands" className="flex flex-col gap-3">
          <h2 id="commands" className="text-lg font-semibold text-primary">
            Командууд
          </h2>
          <ul className="flex flex-col gap-2">
            {COMMANDS.map((c) => (
              <li key={c.cmd} className="flex flex-col gap-1 rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset">
                <code className="w-fit rounded-md bg-secondary px-2 py-0.5 font-mono text-sm font-semibold text-brand-secondary">{c.example}</code>
                <p className="text-sm text-tertiary">{c.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="faq" className="flex flex-col gap-3">
          <h2 id="faq" className="text-lg font-semibold text-primary">
            Түгээмэл асуулт
          </h2>
          <dl className="flex flex-col gap-3">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset">
                <dt className="font-semibold text-primary">{f.q}</dt>
                <dd className="mt-1 text-sm text-tertiary">{f.a}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-tertiary">
            Бусад сувгууд: Facebook, Instagram, Threads, push мэдэгдэл. Өдрийн тоймыг сайтаас ч уншиж болно:{" "}
            <Link href="/digest" prefetch={false} className="font-semibold text-brand-secondary hover:underline">
              Онцлох тойм →
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
