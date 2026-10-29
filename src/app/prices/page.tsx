import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Chip } from "@/components/iltod/badges";
import { DataAge } from "@/components/iltod/data-age";
import { Empty } from "@/components/iltod/empty";
import { Ledger } from "@/components/iltod/macro-strip";
import { PageHeader } from "@/components/iltod/page-header";
import { PriceLine } from "@/components/iltod/price-line";
import { pctLabel } from "@/components/iltod/prices-line";
import { ShareButton } from "@/components/iltod/share-button";
import { FeedSkeleton } from "@/components/iltod/skeletons";
import { YearTable } from "@/components/iltod/year-table";
import {
  AGO_YEARS,
  agoPoints,
  type GoodSeries,
  monthLabel,
  perWage,
  PRICES_SOURCE_URL,
  type PricesSnapshot,
  quarterLabel,
  UB_CODE,
  valueAt,
  wagePairs,
  WAGES_SOURCE_URL,
  type WagesSnapshot,
  yearlyPct,
  yearlySeries,
} from "@/lib/budget/prices";
import { isOfficialSource, TARIFFS_VERIFIED_THROUGH, verifiedTariffs } from "@/lib/budget/tariffs";
import { formatDateMn, formatNumber } from "@/lib/format";
import { getIndicator } from "@/lib/queries";
import { jsonLd } from "@/lib/site";
import { breadcrumbLd, datasetLd } from "@/lib/structured-data";
import { cx } from "@/utils/cx";

export const metadata: Metadata = {
  title: "Махны үнэ, бензиний үнэ: 1, 5, 10, 15 жилийн өмнө",
  alternates: { canonical: "/prices" },
  description:
    "Үхрийн мах, хонины мах, гурил, талх, бензин, гуанзны хоолны Улаанбаатар хотын сарын дундаж үнэ 2010 оноос хойш (ҮСХ). 1, 5, 10, 15 жилийн өмнө хэд байсан, дундаж цалин хэдэн кг мах авдаг байсан, аймгаар хэд вэ, цахилгаан, усны тариф.",
};

/** The goods compared against a month's wage, in the "Цалингаар хэмжвэл" table. */
const WAGE_GOODS = ["beef", "mutton", "flour", "petrol", "canteen"];
/** The goods in the aimag table. */
const REGION_GOODS = ["beef", "mutton", "flour", "petrol"];

const num = (v: number | null) => (v === null ? "—" : formatNumber(v));
const yearsLabel = (y: number) => `${y} жилийн өмнө`;

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-brand-secondary hover:underline">
      {children}
    </a>
  );
}

function Section({ id, title, note, children }: { id: string; title: string; note?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`${id}-title`} id={id} className="flex scroll-mt-24 flex-col gap-4 border-t border-line pt-6">
      <header className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-lg font-semibold text-primary">
          {title}
        </h2>
        {note && <p className="text-xs text-tertiary">{note}</p>}
      </header>
      {children}
    </section>
  );
}

/** The last month of a wage quarter ("2026-2" → "2026-06"): the price that wage was paid against. */
function quarterEndMonth(q: string): string {
  return `${q.slice(0, 4)}-${String(Number(q.slice(5)) * 3).padStart(2, "0")}`;
}

function Overview({ snap }: { snap: PricesSnapshot }) {
  const cells = snap.goods
    .filter((g) => g.ub.at(-1) !== null)
    .map((g) => {
      const series = g.ub.slice(-30).filter((v): v is number => v !== null);
      const five = agoPoints(snap.months, g.ub, snap.latestMonth, [5])[0];
      return {
        label: g.name,
        value: formatNumber(g.ub.at(-1) as number),
        unit: `₮/${g.unit}`,
        note: five.value !== null ? `5 жилийн өмнө ${formatNumber(five.value)} ₮` : monthLabel(snap.latestMonth),
        href: `#${g.key}`,
        series: series.length >= 2 ? series : undefined,
        delta: pctLabel(yearlyPct(snap.months, g.ub)),
        since: snap.months.at(-Math.min(snap.months.length, 30)),
      };
    });
  return <Ledger cells={cells} />;
}

function GoodBlock({ snap, g }: { snap: PricesSnapshot; g: GoodSeries }) {
  const now = g.ub.at(-1);
  if (now === null || now === undefined) return null;
  const ago = agoPoints(snap.months, g.ub, snap.latestMonth, AGO_YEARS);
  return (
    <section id={g.key} aria-labelledby={`${g.key}-title`} className="flex scroll-mt-24 flex-col gap-4 border-t border-line pt-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 id={`${g.key}-title`} className="text-md font-semibold text-primary">
          {g.name}
        </h3>
        <p className="num-mono text-2xl text-primary">
          {formatNumber(now)} <span className="text-xs font-medium text-tertiary">₮/{g.unit}</span>
        </p>
      </div>
      <PriceLine months={snap.months} values={g.ub} unit={`₮/${g.unit}`} label={g.name} />
      <dl className="grid grid-cols-2 gap-x-3 sm:grid-cols-4">
        {ago.map((p) => {
          const pct = pctLabel(p.pct);
          return (
            <div key={p.years} className="flex min-w-0 flex-col border-t border-line-soft py-2">
              <dt className="label-mono truncate text-tertiary">{yearsLabel(p.years)}</dt>
              <dd className="num-mono mt-0.5 text-lg text-primary">
                {num(p.value)}
                {p.value !== null && <span className="ml-1 text-xs font-medium text-tertiary">₮</span>}
              </dd>
              <dd className="label-mono mt-0.5 normal-case text-tertiary" title={`${p.month} → ${snap.latestMonth}`}>
                {pct ? `${pct} өнөөдрийг хүртэл` : p.value === null ? `${p.month}: мэдээлэл алга` : ""}
              </dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function Yearly({ snap }: { snap: PricesSnapshot }) {
  const goods = snap.goods.filter((g) => g.ub.at(-1) !== null);
  if (goods.length === 0) return null;
  const years = yearlySeries(snap.months, goods[0].ub).map((p) => p.label);
  const rows = goods.map((g) => ({ name: `${g.name}, ₮/${g.unit}`, values: Object.fromEntries(yearlySeries(snap.months, g.ub).map((p) => [p.label, p.value])) }));
  return <YearTable caption="Улаанбаатар хотын сарын дундаж үнэ, он бүрийн 9-р сар" years={years} rows={rows} format={num} summary="Бүх бараа он оноор (жил бүрийн 9-р сар, ₮)" rowHeader="Бараа" />;
}

function Wages({ snap, wages }: { snap: PricesSnapshot; wages: WagesSnapshot }) {
  const pairs = wagePairs(wages, snap.latestMonth);
  if (pairs.length === 0) return null;
  const goods = WAGE_GOODS.map((k) => snap.goods.find((g) => g.key === k)).filter((g): g is GoodSeries => g !== undefined);
  const months = pairs.map((p) => quarterEndMonth(p.quarter));
  return (
    <Section
      id="wages"
      title="Цалингаар хэмжвэл: сарын дундаж цалин хэд авах вэ"
      note={
        <>
          Улсын дундаж сарын нэрлэсэн цалин (<SourceLink href={WAGES_SOURCE_URL}>ҮСХ, {wages.updated ? `шинэчлэгдсэн ${formatDateMn(wages.updated)}` : "улирал бүр"}</SourceLink>), тухайн улирлын сүүлийн сарын Улаанбаатарын үнэд
          хуваасан бүхэл тоо. Татвар, НДШ суутгахаас өмнөх цалин.
        </>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <caption className="sr-only">Нэг сарын дундаж цалингаар авч болох хэмжээ, улирлаар</caption>
          <thead className="border-b border-line text-xs text-tertiary">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">
                Бараа
              </th>
              {pairs.map((p) => (
                <th key={p.quarter} scope="col" className="py-2 pr-4 text-right font-medium">
                  {quarterLabel(p.quarter)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            <tr className="bg-secondary">
              <th scope="row" className="py-2 pr-4 font-medium text-primary">
                Дундаж цалин, ₮/сар
              </th>
              {pairs.map((p) => (
                <td key={p.quarter} className="num-mono py-2 pr-4 text-right whitespace-nowrap text-primary">
                  {num(p.national)}
                </td>
              ))}
            </tr>
            {goods.map((g) => (
              <tr key={g.key}>
                <th scope="row" className="py-2 pr-4 font-medium text-primary">
                  {g.name}, {g.unit}
                </th>
                {pairs.map((p, i) => {
                  const price = valueAt(snap.months, g.ub, months[i]);
                  const n = perWage(p.national, price);
                  return (
                    <td key={p.quarter} className="py-2 pr-4 text-right whitespace-nowrap text-secondary tabular-nums" title={price !== null ? `${months[i]}: ${formatNumber(price)} ₮/${g.unit}` : undefined}>
                      {n === null ? "—" : `${formatNumber(n)} ${g.unit}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pairs.some((p) => p.ub !== null) && (
        <p className="text-xs text-tertiary">
          Улаанбаатарын дундаж цалин: {pairs.map((p) => `${quarterLabel(p.quarter)} ${num(p.ub)} ₮`).join(" · ")}.
        </p>
      )}
    </Section>
  );
}

function Regions({ snap }: { snap: PricesSnapshot }) {
  const goods = REGION_GOODS.map((k) => snap.goods.find((g) => g.key === k)).filter((g): g is GoodSeries => g !== undefined);
  const rows = snap.regions.filter((r) => goods.some((g) => g.regions[r.code] !== null && g.regions[r.code] !== undefined));
  if (goods.length === 0 || rows.length < 2) return null;
  return (
    <Section id="aimags" title={`Аймгаар: ${monthLabel(snap.latestMonth)}`} note="Аймгийн төвийн сарын дундаж үнэ, ₮ (ҮСХ-ны мөн хүснэгт). Улаанбаатар эхэнд, аймгууд ҮСХ-ны дарааллаар (баруунаас зүүн).">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <caption className="sr-only">Гол нэрийн барааны үнэ Улаанбаатар ба 21 аймагт, {monthLabel(snap.latestMonth)}</caption>
          <thead className="border-b border-line text-xs text-tertiary">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">
                Аймаг
              </th>
              {goods.map((g) => (
                <th key={g.key} scope="col" className="py-2 pr-4 text-right font-medium">
                  {g.name.replace(/ \(.*\)$/, "")}, ₮/{g.unit}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {rows.map((r) => (
              <tr key={r.code} className={cx(r.code === UB_CODE && "bg-secondary")}>
                <th scope="row" className="py-1.5 pr-4 font-medium text-primary">
                  {r.name}
                </th>
                {goods.map((g) => (
                  <td key={g.key} className="py-1.5 pr-4 text-right whitespace-nowrap text-secondary tabular-nums">
                    {num(g.regions[r.code] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Tariffs() {
  const rows = verifiedTariffs();
  return (
    <Section
      id="tariffs"
      title="Цахилгаан, ус: айл өрхийн тариф"
      note={
        <>
          ҮСХ-ны үнийн хүснэгтэд тариф байхгүй тул эдгээр мөрийг зохицуулагчийн шийдвэрээс хүн гараар уншиж оруулсан, мөр бүр эх хуудастай. Албан хуудсан дээр нь баталгаажуулж чадаагүй тариф (жишээ нь 2026 оны цахилгааны шинэчлэл) энд
          харагдахгүй. Сүүлд шалгасан: {formatDateMn(TARIFFS_VERIFIED_THROUGH)}.
        </>
      }
    >
      <ul className="flex flex-col divide-y divide-line-soft">
        {rows.map((t) => (
          <li key={`${t.kind}-${t.from}`} className="flex flex-col gap-2 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="font-medium text-primary">
                {t.kind === "electricity" ? "⚡" : "💧"} {t.label}
              </p>
              <p className="label-mono normal-case text-tertiary">{formatDateMn(t.from)}-наас</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {t.values.map((v) => (
                <Chip key={v.label} tone="mnt">
                  {v.label}: {v.value.toLocaleString("en-US")} {v.unit}
                </Chip>
              ))}
            </div>
            {t.note && <p className="text-xs text-tertiary">{t.note}</p>}
            <p className="flex flex-wrap items-center gap-2 text-xs text-tertiary">
              <SourceLink href={t.source.url}>{t.source.name} ↗</SourceLink>
              <Chip tone={isOfficialSource(t.source.url) ? "brand" : "plain"}>{isOfficialSource(t.source.url) ? "албан эх сурвалж" : "хэвлэлийн мэдээ"}</Chip>
              <span>шалгасан {formatDateMn(t.verified)}</span>
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
}

async function Prices() {
  const [prices, wages] = await Promise.all([getIndicator<PricesSnapshot>("prices_nso"), getIndicator<WagesSnapshot>("wages_nso")]);
  if (!prices) {
    return (
      <>
        <Empty title="Үнийн өгөгдөл хараахан татагдаагүй" description="ҮСХ-ны сарын дундаж үнийг өдөр бүр автоматаар татна. Доорх тарифууд гараар оруулсан мөрүүд." />
        <Tariffs />
      </>
    );
  }
  const snap = prices.data;
  const goods = snap.goods.filter((g) => g.ub.at(-1) !== null);
  const beef = goods.find((g) => g.key === "beef");
  const beefFifteen = beef ? agoPoints(snap.months, beef.ub, snap.latestMonth, [15])[0] : null;
  return (
    <div className="flex flex-col gap-8 pb-10">
      <p className="text-sm text-secondary">
        <strong>Бидний дүгнэлт биш, ҮСХ-ны тоо.</strong> Улаанбаатар хотын сарын дундаж үнэ, нэрлэсэн төгрөгөөр (инфляцийг тооцоогүй): {monthLabel(snap.latestMonth)}
        {beef && beefFifteen?.value ? ` үхрийн мах ${formatNumber(beef.ub.at(-1) as number)} ₮/кг, 15 жилийн өмнө ${formatNumber(beefFifteen.value)} ₮/кг байсан.` : "."} Нэг бараа ижил
        аргаар он дамжин хэмжигдсэн тул тоонууд өөр хоорондоо харьцуулагдана; дундаж цалин мөн ҮСХ-ных. Ямар тариф яагаад өссөн, хэн буруутай гэдгийг энэ хуудас хэлэхгүй.
      </p>

      <Overview snap={snap} />

      <section aria-labelledby="goods-title" className="flex flex-col gap-2">
        <h2 id="goods-title" className="label-mono text-tertiary">
          Бараа тус бүр · {monthLabel(snap.latestMonth)} · 1, 5, 10, 15 жилийн өмнөхтэй
        </h2>
        {goods.map((g) => (
          <GoodBlock key={g.key} snap={snap} g={g} />
        ))}
        <div className="border-t border-line pt-4">
          <Yearly snap={snap} />
        </div>
      </section>

      {wages && <Wages snap={snap} wages={wages.data} />}
      <Regions snap={snap} />
      <Tariffs />

      <footer className="flex flex-col gap-1 border-t border-line pt-4 text-xs text-tertiary">
        <p>
          Эх сурвалж: <SourceLink href={PRICES_SOURCE_URL}>ҮСХ, «Гол нэрийн зарим барааны дундаж үнэ» (DT_NSO_0600_019V1)</SourceLink>
          {snap.updated ? ` · ҮСХ шинэчилсэн ${formatDateMn(snap.updated)}` : ""} · <DataAge at={prices.updatedAt} staleDays={45} />
        </p>
        <p>
          ҮСХ сар бүрийн дундаж үнийг дараа сарын эхээр нийтэлдэг; энэ хуудас шинэ сар гарахаар өөрөө шинэчлэгдэнэ. Хүснэгтийн бүх 43 бараа, 21 аймгийн тоог ҮСХ-ны сайтаас өөрөө татаж болно. Хэрэв тоо зөрүүтэй санагдвал{" "}
          <Link href="/support" className="font-semibold text-brand-secondary hover:underline">
            бидэнд бичээрэй
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}

const PRICES_LD = {
  "@context": "https://schema.org",
  "@graph": [
    datasetLd(
      {
        name: "Гол нэрийн барааны сарын дундаж үнэ, Улаанбаатар ба аймгууд, 2010 оноос",
        description: "Үндэсний статистикийн хорооны сар бүрийн дундаж үнэ (төгрөг): мах, гурил, талх, будаа, сүү, өндөг, төмс, элсэн чихэр, бензин, дизель, гуанзны хоол, түлшний мод. ИЛ ТОД МЭДЭЭ 1, 5, 10, 15 жилийн өмнөхтэй харьцуулж харуулна.",
        creator: { name: "Үндэсний статистикийн хороо", url: "https://www.1212.mn" },
        sourceUrl: PRICES_SOURCE_URL,
        temporalCoverage: "2010-12/..",
        keywords: ["махны үнэ", "бензиний үнэ", "гурилын үнэ", "үнийн өсөлт", "инфляци", "ҮСХ"],
      },
      "/prices",
    ),
    datasetLd(
      {
        name: "Сарын дундаж нэрлэсэн цалин, бүс, аймаг, нийслэлээр, улирлаар",
        description: "Үндэсний статистикийн хорооны улирал бүрийн дундаж цалин (мянган төгрөг), улсын хэмжээнд ба Улаанбаатар хотод.",
        creator: { name: "Үндэсний статистикийн хороо", url: "https://www.1212.mn" },
        sourceUrl: WAGES_SOURCE_URL,
        temporalCoverage: "2000-10/..",
        keywords: ["дундаж цалин", "цалин", "ҮСХ"],
      },
      "/prices",
    ),
    breadcrumbLd([{ name: "Үнэ", path: "/prices" }]),
  ],
};

export default function PricesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(PRICES_LD) }} />
      <PageHeader
        eyebrow="🛒 Амьдралын үнэ · ҮСХ-ны тоогоор"
        title="Махны үнэ, бензиний үнэ: 1, 5, 10, 15 жилийн өмнө"
        description="Мах, гурил, талх, бензин, гуанзны хоол Улаанбаатарт хэд байсан, өнөөдөр хэд болсон; сарын дундаж цалин тэр үед хэдэн кг мах авдаг байсан; аймгаар хэд вэ; цахилгаан, усны тариф. Үндэсний статистикийн хорооны албан тоо, бидний тайлбаргүй."
      >
        <div className="flex flex-wrap gap-2">
          <Link href="/data" prefetch={false} className="rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-bg-primary transition hover:opacity-90">
            📈 Инфляци, ханш, бодлогын хүү
          </Link>
          <ShareButton path="/prices" title="Махны үнэ, бензиний үнэ: 1, 5, 10, 15 жилийн өмнө хэд байсан бэ?" />
        </div>
      </PageHeader>
      <Suspense fallback={<FeedSkeleton />}>
        <Prices />
      </Suspense>
    </>
  );
}
