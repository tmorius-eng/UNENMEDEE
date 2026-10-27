import type { Metadata } from "next";
import { Suspense } from "react";

import { Badge } from "@/components/base/badges/badges";
import { SeriesLineChart } from "@/components/iltod/charts";
import { Empty } from "@/components/iltod/empty";
import { MacroStrip } from "@/components/iltod/macro-strip";
import { PageHeader } from "@/components/iltod/page-header";
import { FeedSkeleton } from "@/components/iltod/skeletons";
import type { OpenDataset } from "@/db/schema";
import { formatDateMn, formatMntShort, formatNumber } from "@/lib/format";
import type { MacroSnapshot } from "@/lib/mongolbank/client";
import { getIndicator, getOpenDatasets } from "@/lib/queries";
import { jsonLd } from "@/lib/site";
import { breadcrumbLd, datasetLd } from "@/lib/structured-data";
import type { DatasetHighlight, SeriesPoint } from "@/lib/types";
import { cx } from "@/utils/cx";

export const metadata: Metadata = {
  title: "Валютын ханш, инфляц, бодлогын хүү — нээлттэй өгөгдөл",
  alternates: { canonical: "/data" },
  description: "Монголбанкны валютын ханш, инфляц, бодлогын хүү, валютын нөөц, алтны үнэ сүүлийн тоогоор, мөн opendata.mn-ийн цалин, тендер, хар жагсаалт, УИХ-ын ирц. Тоо бүр эх өгөгдөлтэйгөө.",
};

type Highlight<K extends DatasetHighlight["kind"]> = Extract<DatasetHighlight, { kind: K }>;

const fmt = (n: number, digits = 2) => n.toLocaleString("en-US", { maximumFractionDigits: digits });

function Panel({ dataset, title, children }: { dataset: OpenDataset; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-5">
      <header className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-primary">{title}</h2>
        <p className="text-xs text-tertiary">
          Эх сурвалж: {dataset.dataSource ?? "opendata.mn"} · {dataset.title}
          {dataset.sourceUpdatedAt ? ` · шинэчлэгдсэн ${formatDateMn(dataset.sourceUpdatedAt)}` : ""} ·{" "}
          <a href={dataset.pageUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-secondary hover:underline">
            opendata.mn
          </a>{" "}
          ·{" "}
          <a href={dataset.apiUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-secondary hover:underline">
            API
          </a>
        </p>
      </header>
      {children}
    </section>
  );
}

function Table({ caption, head, rows, numeric = [] }: { caption: string; head: string[]; rows: (string | number)[][]; numeric?: number[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line text-xs text-tertiary">
          <tr>
            {head.map((h, i) => (
              <th key={h} scope="col" className={cx("py-2 pr-4 font-medium", numeric.includes(i) && "text-right")}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={cx("py-2 pr-4", j === 0 ? "font-medium text-primary" : "text-secondary", numeric.includes(j) && "text-right tabular-nums")}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SeriesTable({ caption, series, unit }: { caption: string; series: SeriesPoint[]; unit: string }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-tertiary">Хүснэгтээр харах</summary>
      <Table caption={caption} head={["Хугацаа", unit]} rows={[...series].reverse().map((p) => [p.label, fmt(p.value)])} numeric={[1]} />
    </details>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "up" | "down" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-t border-line-soft py-3">
      <p className="label-mono truncate text-tertiary">{label}</p>
      <p className="num-mono text-xl text-primary">{value}</p>
      {sub && <p className={cx("text-xs tabular-nums", tone === "up" ? "text-risk" : tone === "down" ? "text-brand-secondary" : "text-tertiary")}>{sub}</p>}
    </div>
  );
}

function Fx({ d, h }: { d: OpenDataset; h: Highlight<"fx"> }) {
  return (
    <Panel dataset={d} title={`💱 Монголбанкны албан ханш (${h.asOf})`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {h.rates.map((r) => (
          <Tile
            key={r.code}
            label={`${r.code} · ${r.name}`}
            value={`${fmt(r.rate)} ₮`}
            sub={r.changePct === null ? undefined : `${r.changePct > 0 ? "▲" : r.changePct < 0 ? "▼" : "•"} ${fmt(Math.abs(r.changePct))}% / 30 хоног`}
            tone={r.changePct === null ? undefined : r.changePct > 0 ? "up" : r.changePct < 0 ? "down" : undefined}
          />
        ))}
      </div>
      <SeriesLineChart data={h.usdSeries} name="USD" unit="₮" ariaLabel="Ам.долларын ханшийн хөдөлгөөн" />
      <SeriesTable caption="Ам.долларын ханш, өдрөөр" series={h.usdSeries} unit="₮ / USD" />
    </Panel>
  );
}

function Macro({ d, h }: { d: OpenDataset; h: Highlight<"macro"> }) {
  return (
    <Panel dataset={d} title="📈 Макро эдийн засгийн гол үзүүлэлтүүд">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {h.indicators.map((i) => {
          const prev = i.series[i.series.length - 2];
          return (
            <Tile
              key={i.name}
              label={i.name}
              value={`${fmt(i.latest.value)} ${i.unit}`}
              sub={prev ? `${i.latest.label} · өмнө нь ${fmt(prev.value)} (${prev.label})` : i.latest.label}
            />
          );
        })}
      </div>
    </Panel>
  );
}

function Salary({ d, h }: { d: OpenDataset; h: Highlight<"salary"> }) {
  return (
    <Panel dataset={d} title={`💼 Дундаж цалин (${h.latestQuarter} улирал)`}>
      {h.national !== null && <Tile label="Улсын дундаж цалин" value={`${fmt(h.national)} ${h.unit}`} sub={`${h.latestQuarter} улирал`} />}
      <SeriesLineChart data={h.series} name="Улсын дундаж" unit={h.unit} ariaLabel="Улсын дундаж цалингийн өөрчлөлт, улирлаар" />
      <div className="grid gap-4 md:grid-cols-2">
        <Table caption="Хамгийн өндөр цалинтай салбар" head={["Хамгийн өндөр", h.unit]} rows={h.top.map((p) => [p.label, fmt(p.value)])} numeric={[1]} />
        <Table caption="Хамгийн бага цалинтай салбар" head={["Хамгийн бага", h.unit]} rows={h.bottom.map((p) => [p.label, fmt(p.value)])} numeric={[1]} />
      </div>
      <SeriesTable caption="Улсын дундаж цалин, улирлаар" series={h.series} unit={h.unit} />
    </Panel>
  );
}

function Tenders({ d, h }: { d: OpenDataset; h: Highlight<"tenders"> }) {
  return (
    <Panel dataset={d} title={`🏗 Төрийн худалдан авалт (тендер), ${h.latestYear} он`}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {h.byYear.map((y) => (
          <Tile key={y.year} label={`${y.year} он`} value={`${formatNumber(y.count)} тендер`} sub={`Нийт төсөв ${formatMntShort(y.budget)}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {h.statuses.map((s) => (
          <Badge key={s.label} type="pill-color" color="gray" size="sm">
            {s.label}: {formatNumber(s.value)}
          </Badge>
        ))}
      </div>
      <Table
        caption="Хамгийн их төсөвтэй тендерүүд"
        head={["Хамгийн их төсөвтэй тендер", "Төсөв", "Төлөв", "Дугаар"]}
        rows={h.largest.map((t) => [t.name, formatMntShort(t.budget), t.status, t.number])}
        numeric={[1]}
      />
    </Panel>
  );
}

function Blacklist({ d, h }: { d: OpenDataset; h: Highlight<"blacklist"> }) {
  return (
    <Panel dataset={d} title={`⛔ Тендерт оролцох эрхээ хасуулсан ${h.activeCount} байгууллага`}>
      <p className="text-sm text-tertiary">
        Худалдан авах ажиллагааны улсын байцаагчийн дүгнэлтээр гэрээний үүргээ биелүүлээгүй эсвэл худал мэдээлэл ирүүлсэн гэж тогтоогдсон, эрх хасалт нь одоо хүчинтэй
        байгууллагууд (нийт бүртгэл {h.total}).
      </p>
      <details>
        <summary className="cursor-pointer text-sm font-semibold text-brand-secondary">Жагсаалтыг харах</summary>
        <Table caption="Эрхээ хасуулсан байгууллагууд" head={["Байгууллага", "Шалтгаан", "Хүртэл", "Дүгнэлт"]} rows={h.items.map((i) => [i.name, i.reason, i.end, i.note])} />
      </details>
    </Panel>
  );
}

function Attendance({ d, h }: { d: OpenDataset; h: Highlight<"attendance"> }) {
  return (
    <Panel dataset={d} title="🏛 УИХ-ын нэгдсэн хуралдааны ирц">
      <p className="text-sm text-tertiary">
        {h.from} – {h.to} хооронд {h.sessions} хуралдаан, {h.members} гишүүн. &quot;Шалтгаан бүртгэгдээгүй&quot; гэдэг нь ирсэн цаг ч, томилолт, чөлөөний тэмдэглэл ч өгөгдөлд
        байхгүй тохиолдол. Энэ нь тасалсан гэсэн баталгаа биш, иргэд тодруулж асуух үндэслэл юм.
      </p>
      <Table
        caption="УИХ-ын гишүүдийн ирц"
        head={["Гишүүн", "Ирсэн", "Томилолт", "Эмнэлэг", "Чөлөө", "Шалтгаан бүртгэгдээгүй"]}
        rows={h.top.slice(0, 20).map((m) => [m.name, `${m.present}/${m.records}`, m.travel, m.medical, m.leave, m.unexplained])}
        numeric={[1, 2, 3, 4, 5]}
      />
    </Panel>
  );
}

function HighlightPanel({ d }: { d: OpenDataset }) {
  const h = d.highlight;
  if (!h) return null;
  switch (h.kind) {
    case "fx":
      return <Fx d={d} h={h} />;
    case "macro":
      return <Macro d={d} h={h} />;
    case "salary":
      return <Salary d={d} h={h} />;
    case "tenders":
      return <Tenders d={d} h={h} />;
    case "blacklist":
      return <Blacklist d={d} h={h} />;
    case "attendance":
      return <Attendance d={d} h={h} />;
  }
}

const ORDER: DatasetHighlight["kind"][] = ["fx", "macro", "tenders", "blacklist", "attendance", "salary"];

function Catalogue({ datasets }: { datasets: OpenDataset[] }) {
  const groups = Map.groupBy(datasets, (d) => d.category);
  return (
    <section aria-labelledby="catalogue" className="flex flex-col gap-6">
      <h2 id="catalogue" className="text-lg font-semibold text-primary">
        🗂 Бүх өгөгдлийн багц ({datasets.length})
      </h2>
      {[...groups.entries()].map(([category, items]) => (
        <div key={category} className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-secondary">{category}</h3>
          <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((d) => (
              <li key={d.id} className="flex flex-col gap-2 rounded-2xl bg-primary p-4 ring-1 ring-line ring-inset">
                <a href={d.pageUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:text-brand-secondary hover:underline">
                  {d.title}
                </a>
                {d.description && <p className="line-clamp-3 text-sm text-tertiary">{d.description}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-1.5 text-xs text-tertiary">
                  {d.fileType && (
                    <Badge type="pill-color" color="gray" size="sm">
                      {d.fileType}
                    </Badge>
                  )}
                  <span>{formatNumber(d.rowCount)} мөр</span>
                  {d.columns.length > 0 && <span>· {d.columns.length} багана</span>}
                  {d.license && <span>· {d.license}</span>}
                  <a href={d.apiUrl} target="_blank" rel="noreferrer" className="ml-auto font-semibold text-brand-secondary hover:underline">
                    API →
                  </a>
                </div>
                {d.dataSource && <p className="text-xs text-quaternary">Эх сурвалж: {d.dataSource}</p>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** Bank of Mongolia: the homepage cards plus the series behind them (each with a table view). */
async function Mongolbank() {
  const snap = await getIndicator<MacroSnapshot>("mongolbank");
  if (!snap) return null;
  const { policyRate, inflation, fx, reserves } = snap.data;
  const charts = [
    policyRate && { title: "Бодлогын хүү (%)", data: policyRate.history, unit: "%" },
    inflation && { title: "Инфляц, улсын дүнгээр, жилийн (%)", data: inflation.history, unit: "%" },
    fx && { title: "1 USD, албан ханш (₮)", data: fx.usdHistory, unit: "₮" },
    reserves && { title: "Гадаад валютын улсын нөөц (сая $)", data: reserves.history, unit: "сая $" },
  ].filter((c): c is { title: string; data: SeriesPoint[]; unit: string } => Boolean(c));
  return (
    <section className="flex flex-col gap-4 pb-10">
      <h2 className="text-lg font-semibold text-primary">Монголбанк</h2>
      <MacroStrip />
      <div className="grid gap-4 lg:grid-cols-2">
        {charts.map((c) => (
          <div key={c.title} className="flex flex-col gap-2 rounded-3xl bg-primary p-5 ring-1 ring-line ring-inset">
            <h3 className="text-sm font-semibold text-primary">{c.title}</h3>
            <SeriesLineChart data={c.data} name={c.title} unit={c.unit} ariaLabel={c.title} />
            <SeriesTable caption={c.title} series={c.data} unit={c.unit} />
          </div>
        ))}
      </div>
    </section>
  );
}

async function OpenData() {
  const datasets = await getOpenDatasets();
  if (datasets.length === 0) {
    return <Empty title="Өгөгдөл хараахан татагдаагүй" description="opendata.mn-ийн өгөгдлийг өдөрт 2 удаа автоматаар шинэчилнэ." />;
  }
  const highlighted = datasets.filter((d) => d.highlight).sort((a, b) => ORDER.indexOf(a.highlight!.kind) - ORDER.indexOf(b.highlight!.kind));
  return (
    <div className="flex flex-col gap-8">
      {highlighted.map((d) => (
        <HighlightPanel key={d.id} d={d} />
      ))}
      <Catalogue datasets={datasets} />
    </div>
  );
}

/** What the page re-shows, with the official publisher of each (Google Dataset Search). */
const DATA_LD = {
  "@context": "https://schema.org",
  "@graph": [
    datasetLd(
      {
        name: "Монголбанкны гол үзүүлэлтүүд: валютын ханш, инфляц, бодлогын хүү, валютын нөөц, алтны үнэ",
        description: "Монголбанкны вэбсайтын нийтэлдэг бодлогын хүү, улсын дүнгийн инфляц, төгрөгийн албан ханш, гадаад валютын улсын нөөц, алт, мөнгөний үнийн цуваа. ИЛ ТОД МЭДЭЭ өдөр бүр татаж, өөрчлөлтгүйгээр харуулна.",
        creator: { name: "Монголбанк", url: "https://www.mongolbank.mn" },
        sourceUrl: "https://www.mongolbank.mn",
        keywords: ["валютын ханш", "инфляц", "бодлогын хүү", "валютын нөөц", "алтны үнэ", "Монголбанк"],
      },
      "/data",
    ),
    datasetLd(
      {
        name: "opendata.mn нээлттэй өгөгдлийн багцууд: цалин, тендер, хар жагсаалт, УИХ-ын ирц",
        description: "Монгол Улсын нээлттэй өгөгдлийн порталд (opendata.mn) нийтлэгдсэн өгөгдлийн багцуудын мета өгөгдөл ба гол үзүүлэлт: дундаж цалин, төрийн худалдан авалт, тендерт оролцох эрхээ хасуулсан байгууллага, УИХ-ын нэгдсэн хуралдааны ирц.",
        creator: { name: "Нээлттэй өгөгдлийн портал", url: "https://opendata.mn" },
        sourceUrl: "https://opendata.mn",
        keywords: ["нээлттэй өгөгдөл", "дундаж цалин", "тендер", "УИХ-ын ирц"],
      },
      "/data",
    ),
    breadcrumbLd([{ name: "Нээлттэй өгөгдөл", path: "/data" }]),
  ],
};

export default function DataPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(DATA_LD) }} />
      <PageHeader
        eyebrow="📊 Нээлттэй өгөгдөл · Тоо худлаа хэлдэггүй"
        title="Валютын ханш, инфляц, эдийн засгийн тоо"
        description="opendata.mn нээлттэй өгөгдлийн сангийн бүх багцыг өдөрт 2 удаа API-аар татаж, хамгийн чухал үзүүлэлтүүдийг энд харуулна: ханш, инфляци, цалин, тендер, хар жагсаалт, УИХ-ын ирц. Тоо бүр эх өгөгдөл рүүгээ холбогдоно."
      />
      <Suspense fallback={null}>
        <Mongolbank />
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <OpenData />
      </Suspense>
    </>
  );
}
