import { ArrowLeft, LinkExternal01 } from "@untitledui/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SeriesLineChart } from "@/components/iltod/charts";
import { TimeAgo } from "@/components/iltod/time-ago";
import type { AssetDeclaration } from "@/db/schema";
import { formatMntShort, formatNumber } from "@/lib/format";
import { declarationFlags } from "@/lib/officials/flags";
import { getPolitician, getPoliticianIds } from "@/lib/queries";

export async function generateStaticParams() {
  const ids = await getPoliticianIds();
  return (ids.length ? ids : [0]).map((id) => ({ id: String(id) }));
}

export async function generateMetadata({ params }: PageProps<"/officials/[id]">): Promise<Metadata> {
  const { id } = await params;
  const data = await getPolitician(Number(id));
  if (!data) return { title: "Олдсонгүй", robots: { index: false } };
  const p = data.politician;
  return {
    title: `${p.fullName}: хөрөнгө, орлогын мэдүүлэг`,
    description: `${p.party ?? ""} УИХ-ын гишүүн ${p.shortName}-ийн Авлигатай тэмцэх газарт гаргасан хөрөнгө, орлогын мэдүүлэг жил бүрээр, мэдээнд дурдагдсан байдал.`,
    alternates: { canonical: `/officials/${p.id}` },
  };
}

const COLUMNS: { key: keyof AssetDeclaration; label: string }[] = [
  { key: "incomeOwn", label: "Өөрийн орлого" },
  { key: "incomeFamily", label: "Гэр бүлийн орлого" },
  { key: "buildingsValue", label: "Үл хөдлөх" },
  { key: "transportValue", label: "Тээврийн хэрэгсэл" },
  { key: "landValue", label: "Газар" },
  { key: "savings", label: "Хадгаламж" },
  { key: "receivables", label: "Авлага" },
  { key: "otherAssets", label: "Хувьцаа, зөвшөөрөл, бусад" },
  { key: "totalAssets", label: "Нийт хөрөнгө" },
  { key: "loans", label: "Зээл (өр)" },
  { key: "gifts", label: "Бэлэг" },
];

function money(v: unknown): string {
  return typeof v === "number" ? formatMntShort(v) : "—";
}

async function Profile({ params }: { params: PageProps<"/officials/[id]">["params"] }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const data = await getPolitician(id);
  if (!data) notFound();
  const { politician: p, declarations: rows, mentions } = data;
  const flags = declarationFlags(rows.map((r) => ({ ...r, totalAssets: r.totalAssets ?? 0 })));
  const latest = rows.at(-1);

  return (
    <article className="flex flex-col gap-8">
      <Link href="/officials" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-tertiary hover:text-secondary">
        <ArrowLeft className="size-4" /> Бүх гишүүд
      </Link>
      <header className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- portraits come from parliament.mn */}
        {p.photoUrl && <img src={p.photoUrl} alt={p.fullName} className="size-20 shrink-0 rounded-full bg-secondary object-cover" />}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-display-xs font-semibold tracking-tight text-primary">{p.fullName}</h1>
          <p className="text-sm text-tertiary">
            УИХ-ын гишүүн{p.isActive ? "" : " (асан)"} · {p.party ?? "—"}
            {p.constituency ? ` · ${p.constituency}${p.votes ? ` (${formatNumber(p.votes)} санал)` : ""}` : ""}
            {p.termStart ? ` · ${p.termStart.slice(0, 4)}–${p.termEnd?.slice(0, 4) ?? ""}` : ""}
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-brand-secondary">
            {p.xacxomId && (
              <a href={`https://xacxom.iaac.mn/xacxom/${p.xacxomId}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                ХАСХОМ мэдүүлэг <LinkExternal01 className="size-3.5" />
              </a>
            )}
            <a href={p.profileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
              parliament.mn <LinkExternal01 className="size-3.5" />
            </a>
          </p>
        </div>
      </header>

      <p className="rounded-2xl bg-secondary p-4 text-sm text-secondary">
        Доорх тоо бүр Авлигатай тэмцэх газрын ХАСХОМ системд гишүүний өөрөө гаргасан албан ёсны мэдүүлгээс авсан (₮). Мэдүүлэг бол буруутгал биш. Өөрчлөлтийн шалтгааныг (өв залгамжлал, худалдаа,
        цалин г.м.) эх мэдүүлгээс шалгана уу.
      </p>

      {rows.length === 0 ? (
        <p className="text-tertiary">Энэ гишүүний мэдүүлэг ХАСХОМ системээс олдсонгүй.</p>
      ) : (
        <>
          {latest && (
            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: `Нийт хөрөнгө (${latest.year})`, value: money(latest.totalAssets) },
                { label: "Өөрийн орлого", value: money(latest.incomeOwn) },
                { label: "Гэр бүлийн орлого", value: money(latest.incomeFamily) },
                { label: "Зээл (өр)", value: money(latest.loans) },
              ].map((t) => (
                <div key={t.label} className="rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset">
                  <p className="text-xs text-tertiary">{t.label}</p>
                  <p className="mt-1 text-lg font-semibold text-primary tabular-nums">{t.value}</p>
                </div>
              ))}
            </section>
          )}

          {flags.length > 0 && (
            <section className="flex flex-col gap-2 rounded-2xl bg-warning-primary p-4 ring-1 ring-warning ring-inset">
              <h2 className="text-sm font-semibold text-warning-primary">Анхаарах өөрчлөлт (тооцоолсон, дүгнэлт биш)</h2>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-secondary">
                {flags.map((f) => (
                  <li key={`${f.kind}-${f.year}`}>{f.text}</li>
                ))}
              </ul>
            </section>
          )}

          {rows.length > 1 && (
            <section className="rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset">
              <h2 className="mb-2 text-sm font-semibold text-primary">Нийт хөрөнгө жилээр (сая ₮)</h2>
              <SeriesLineChart data={rows.map((r) => ({ label: String(r.year), value: Math.round((r.totalAssets ?? 0) / 1e5) / 10 }))} name="Нийт хөрөнгө" unit="сая ₮" ariaLabel="Нийт хөрөнгө жилээр" />
            </section>
          )}

          <section className="overflow-x-auto rounded-2xl bg-primary ring-1 ring-secondary ring-inset">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-secondary text-left text-xs text-tertiary">
                  <th className="p-3 font-medium">Үзүүлэлт</th>
                  {rows.map((r) => (
                    <th key={r.year} className="p-3 text-right font-medium">
                      {r.year}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-secondary">
                  <td className="p-3 text-tertiary">Албан тушаал</td>
                  {rows.map((r) => (
                    <td key={r.year} className="p-3 text-right text-xs text-tertiary">
                      {r.positionName ?? "—"}
                    </td>
                  ))}
                </tr>
                {COLUMNS.map((c) => (
                  <tr key={c.key} className={c.key === "totalAssets" ? "border-b border-secondary bg-secondary font-semibold" : "border-b border-secondary"}>
                    <td className="p-3 text-secondary">{c.label}</td>
                    {rows.map((r) => (
                      <td key={r.year} className="p-3 text-right text-primary tabular-nums">
                        {money(r[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {latest?.details?.transports && <p className="text-sm text-tertiary">Тээврийн хэрэгсэл ({latest.year}): {latest.details.transports}</p>}
          <p className="text-xs text-quaternary">
            Эх сурвалж: Авлигатай тэмцэх газар, ХАСХОМ · шинэчлэгдсэн <TimeAgo date={latest?.fetchedAt ?? null} />
          </p>
        </>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-primary">Мэдээнд дурдагдсан</h2>
        {mentions.length ? (
          <ul className="flex flex-col divide-y divide-secondary">
            {mentions.map((m) => (
              <li key={m.slug} className="py-3">
                <Link href={`/article/${m.slug}`} className="font-medium text-primary hover:text-brand-secondary">
                  {m.title}
                </Link>
                <p className="text-xs text-tertiary">
                  {m.sourceName} · <TimeAgo date={m.publishedAt} />
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-tertiary">Төрийн эх сурвалжуудын мэдээнд {p.shortName} одоогоор дурдагдаагүй байна.</p>
        )}
      </section>
    </article>
  );
}

export default function PoliticianPage(props: PageProps<"/officials/[id]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-secondary" />}>
      <Profile params={props.params} />
    </Suspense>
  );
}
