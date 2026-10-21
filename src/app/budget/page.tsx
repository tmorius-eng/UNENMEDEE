import type { Metadata } from "next";
import { Suspense } from "react";

import { GroupedBarChart, SeriesLineChart, SignedBarChart } from "@/components/iltod/charts";
import { Empty } from "@/components/iltod/empty";
import { PageHeader } from "@/components/iltod/page-header";
import { FeedSkeleton } from "@/components/iltod/skeletons";
import { AUDIT_URL, type AuditSnapshot, OPINIONS, type Opinion } from "@/lib/budget/audit";
import { GOVERNMENTS_SOURCE, governmentsInYear } from "@/lib/budget/governments";
import { type BudgetNsoSnapshot, type CategorySeries, NSO_SOURCE_URL } from "@/lib/budget/nso";
import { SHILENDANS_URL, type ShilendansSnapshot } from "@/lib/budget/shilendans";
import type { TaxShareSnapshot } from "@/lib/budget/worldbank";
import { formatDateMn, formatMntShort } from "@/lib/format";
import { getIndicator } from "@/lib/queries";
import { cx } from "@/utils/cx";

export const metadata: Metadata = {
  title: "Улсын төсөв 1990 оноос — татварын мөнгө хаашаа явдаг вэ",
  alternates: { canonical: "/budget" },
  description:
    "Монгол Улсын нэгдсэн төсвийн орлого, зарлага, алдагдал 1990 оноос хойш, тухайн үеийн Ерөнхий сайдтай нь. Татварын мөнгө юунд зарцуулагдсан, Засгийн газрын өр, Шилэн данс, Үндэсний аудитын газрын дүгнэлт. Бүгд албан ёсны эх сурвалжтай.",
};

/** NSO amounts are million ₮; debt is billion ₮. */
const mln = (v: number | null | undefined) => (v === null || v === undefined ? "—" : formatMntShort(v * 1e6));
function pct(part: number, whole: number): string {
  if (!whole) return "—";
  const p = (part / whole) * 100;
  return p > 0 && p < 0.1 ? "<0.1%" : `${p.toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}
const trillion = (v: number | null) => (v === null ? null : Math.round(v / 1e4) / 100);

/** Clearer names for two NSO revenue lines that are only "Аж ахуйн нэгжийн" / "Хүн амын" there. */
const REVENUE_NAME: Record<string, string> = {
  "7": "Аж ахуйн нэгжийн орлогын албан татвар",
  "8": "Хүн амын орлогын албан татвар (ХХОАТ)",
};

const OPINION_INFO: Record<Opinion, string> = {
  "Сөрөг дүгнэлт": "Тайлан бодит байдлыг ноцтой буруу харуулсан гэж аудитор үзсэн.",
  "Татгалзсан дүгнэлт": "Хангалттай баримт өгөөгүй тул аудитор дүгнэлт гаргахаас татгалзсан.",
  "Хязгаарлалтай дүгнэлт": "Тодорхой зөрчлөөс бусад нь зөв гэж үзсэн.",
};

/** audit.mn titles are in capitals; sentence case reads easier (the link keeps the original). */
function sentenceCase(title: string): string {
  return title === title.toLocaleUpperCase("mn") ? title.charAt(0) + title.slice(1).toLocaleLowerCase("mn") : title;
}

function Section({ id, title, source, children }: { id: string; title: string; source: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 rounded-3xl bg-primary p-5 ring-1 ring-secondary ring-inset md:p-6">
      <header className="flex flex-col gap-1">
        <h2 id={id} className="text-lg font-semibold text-primary">
          {title}
        </h2>
        <p className="text-xs text-tertiary">Эх сурвалж: {source}</p>
      </header>
      {children}
    </section>
  );
}

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-semibold text-brand-secondary hover:underline">
      {children}
    </a>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "bad" | "good" }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset">
      <p className="text-xs text-tertiary">{label}</p>
      <p className="text-md font-semibold text-primary tabular-nums md:text-xl">{value}</p>
      {sub && <p className={cx("text-xs", tone === "bad" ? "text-error-primary" : tone === "good" ? "text-success-primary" : "text-tertiary")}>{sub}</p>}
    </div>
  );
}

/** Horizontal share bars in plain HTML: readable as a list, no chart JS. Past `limit` rows the rest is one "Бусад" line. */
function ShareBars({ rows: all, total, format, limit = 12 }: { rows: { name: string; value: number; sub?: string }[]; total: number; format: (v: number) => string; limit?: number }) {
  const rest = all.slice(limit - 1);
  const rows = all.length > limit ? [...all.slice(0, limit - 1), { name: "Бусад", sub: rest.map((r) => r.name).join(", "), value: rest.reduce((a, r) => a + r.value, 0) }] : all;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="flex flex-col gap-3">
      {rows.map((r) => (
        <li key={r.name} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 text-secondary">
              {r.name}
              {r.sub && <span className="block text-xs text-tertiary">{r.sub}</span>}
            </span>
            <span className="shrink-0 text-right font-semibold text-primary tabular-nums">
              {format(r.value)} <span className="font-normal text-tertiary">· {pct(r.value, total)}</span>
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary" aria-hidden>
            <div className="h-2 rounded-full bg-[var(--series-1)]" style={{ width: `${Math.max(1, (r.value / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

function YearTable({ caption, years, rows, format }: { caption: string; years: string[]; rows: { name: string; values: Record<string, number | null> }[]; format: (v: number | null) => string }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs font-semibold text-tertiary">Он оноор хүснэгтээр харах</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-secondary text-xs text-tertiary">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">
                Ангилал
              </th>
              {years.map((y) => (
                <th key={y} scope="col" className="py-2 pr-4 text-right font-medium">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary">
            {rows.map((r) => (
              <tr key={r.name}>
                <th scope="row" className="py-2 pr-4 font-medium text-primary">
                  {r.name}
                </th>
                {years.map((y) => (
                  <td key={y} className="py-2 pr-4 text-right whitespace-nowrap text-secondary tabular-nums">
                    {format(r.values[y] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

/** Latest year that has a total (the newest NSO year can be empty for a while). */
function latestYear(years: string[], total: Record<string, number | null>): string | undefined {
  return [...years].reverse().find((y) => total[y] !== null && total[y] !== undefined);
}

function byLatest(cats: CategorySeries[], year: string, rename: Record<string, string> = {}) {
  return cats
    .map((c) => ({ name: rename[c.code] ?? c.name, value: c.values[year] ?? 0, values: c.values }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
}

function History({ nso }: { nso: BudgetNsoSnapshot }) {
  const rows = nso.history.filter((y) => y.revenue !== null && y.expenditure !== null);
  const last = rows.at(-1);
  const debt = nso.debt.at(-1);
  if (!last) return null;
  const chart = rows.map((y) => ({ label: String(y.year), revenue: trillion(y.revenue), expenditure: trillion(y.expenditure) }));
  const balance = rows.filter((y) => y.balance !== null && y.revenue).map((y) => ({ label: String(y.year), value: Math.round(((y.balance as number) / (y.revenue as number)) * 1000) / 10 }));
  const deficits = rows.filter((y) => (y.balance ?? 0) < 0).length;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile label={`${last.year} оны орлого`} value={mln(last.revenue)} sub="гүйцэтгэлээр" />
        <Tile label={`${last.year} оны зарлага`} value={mln(last.expenditure)} sub="гүйцэтгэлээр" />
        <Tile
          label={`${last.year} оны тэнцэл`}
          value={mln(last.balance)}
          sub={(last.balance ?? 0) < 0 ? "алдагдалтай" : "ашигтай"}
          tone={(last.balance ?? 0) < 0 ? "bad" : "good"}
        />
        {debt && <Tile label={`Засгийн газрын нийт өр (${debt.label.replace("-", " оны ")}-р улирал)`} value={formatMntShort(debt.value * 1e9)} />}
      </div>

      <Section
        id="history"
        title={`Нэгдсэн төсөв ${rows[0].year}–${last.year}: орлого ба зарлага`}
        source={
          <>
            Сангийн яам, <SourceLink href={NSO_SOURCE_URL}>Үндэсний статистикийн хороо (1212.mn)</SourceLink>
            {nso.updated.balance ? ` · шинэчлэгдсэн ${formatDateMn(nso.updated.balance)}` : ""}. Ерөнхий сайд:{" "}
            <SourceLink href={GOVERNMENTS_SOURCE}>Wikipedia</SourceLink>
          </>
        }
      >
        <p className="text-sm text-secondary">
          Батлагдсан төлөвлөгөө биш, жил бүрийн <strong>гүйцэтгэл</strong>. Нэрлэсэн үнээр (инфляцийг тооцоогүй), тиймээс 1990-ээд оны тоо одоогийнхтой харьцуулахад маш бага харагдана.{" "}
          {rows.length} жилийн {deficits}-д нь төсөв алдагдалтай гарсан.
        </p>
        <GroupedBarChart
          data={chart}
          series={[
            { key: "revenue", name: "Орлого" },
            { key: "expenditure", name: "Зарлага" },
          ]}
          unit="их наяд ₮"
          ariaLabel="Нэгдсэн төсвийн орлого, зарлага жилээр, их наяд төгрөгөөр"
        />
        <h3 className="text-sm font-semibold text-primary">Тэнцэл, орлогын хувиар (хасах = алдагдал)</h3>
        <SignedBarChart data={balance} name="Тэнцэл" unit="% (орлоготой харьцуулсан)" ariaLabel="Төсвийн тэнцэл, орлогын хувиар, жилээр" />
        <div className="max-h-[32rem] overflow-auto rounded-2xl ring-1 ring-secondary ring-inset">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Нэгдсэн төсвийн орлого, зарлага, тэнцэл, тухайн оны Ерөнхий сайд</caption>
            <thead className="sticky top-0 border-b border-secondary bg-secondary text-xs text-tertiary">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Он
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Ерөнхий сайд (нам)
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Орлого
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Зарлага
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Тэнцэл
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary">
              {[...rows].reverse().map((y) => (
                <tr key={y.year}>
                  <th scope="row" className="px-3 py-2 font-semibold text-primary tabular-nums">
                    {y.year}
                  </th>
                  <td className="px-3 py-2 text-xs text-secondary">
                    {governmentsInYear(y.year)
                      .map((g) => `${g.pm} (${g.party})`)
                      .join(", ")}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-secondary tabular-nums">{mln(y.revenue)}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-secondary tabular-nums">{mln(y.expenditure)}</td>
                  <td className={cx("px-3 py-2 text-right whitespace-nowrap tabular-nums", (y.balance ?? 0) < 0 ? "text-error-primary" : "text-success-primary")}>{mln(y.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-tertiary">
          Ерөнхий сайдын нэр нь тухайн онд Засгийн газрыг хэн тэргүүлж байсныг л харуулна. Төсвийг УИХ баталдаг; алдагдал, өсөлтийг нэг хүн эсвэл намд оноосон дүгнэлт биш.
        </p>
      </Section>
    </>
  );
}

function Spending({ nso }: { nso: BudgetNsoSnapshot }) {
  const { economic, programmes } = nso.spending;
  const year = latestYear(economic.years, economic.total);
  if (!year) return null;
  const total = economic.total[year] ?? 0;
  const econ = byLatest(economic.categories, year);
  const prog = byLatest(programmes.categories, year);
  const recent = economic.years.slice(-5);
  return (
    <Section
      id="spending"
      title={`Татварын мөнгө юунд зарцуулагдав (${year})`}
      source={
        <>
          Сангийн яам, <SourceLink href="https://www.1212.mn/mn/statistic/statcate/573051/table-view/DT_NSO_0800_001V3">1212.mn, зарлага зориулалтаар</SourceLink>
          {nso.updated.purpose ? ` · шинэчлэгдсэн ${formatDateMn(nso.updated.purpose)}` : ""}
        </>
      }
    >
      <p className="text-sm text-secondary">
        {year} онд нэгдсэн төсвөөс нийт <strong className="text-primary">{mln(total)}</strong> зарцуулсан. Үүний хэдийг цалин, тэтгэвэр, хөрөнгө оруулалт, өрийн төлбөрт зарсныг доор харуулав.
      </p>
      <ShareBars rows={econ} total={total} format={mln} />
      <YearTable caption="Төсвийн зарлага, эдийн засгийн ангиллаар" years={recent} rows={econ} format={mln} />

      {prog.length > 0 && (
        <>
          <h3 className="pt-2 text-sm font-semibold text-primary">Зорилтот арга хэмжээ, хөтөлбөрүүд зориулалтаар</h3>
          <p className="text-xs text-tertiary">
            Энэ нь зөвхөн хөтөлбөр, арга хэмжээний зардал. Жишээ нь эмнэлэг, сургуулийн цалин, урсгал зардал дээрх ангилалд багтсан тул энэ жагсаалт эрүүл мэнд, боловсролын нийт зардал биш.
          </p>
          <ShareBars rows={prog} total={programmes.total[year] ?? 0} format={mln} limit={10} />
        </>
      )}
    </Section>
  );
}

function Revenue({ nso, tax }: { nso: BudgetNsoSnapshot; tax: TaxShareSnapshot | null }) {
  const { revenue } = nso;
  const year = latestYear(revenue.years, revenue.total);
  if (!year) return null;
  const total = revenue.total[year] ?? 0;
  const rows = byLatest(revenue.categories, year, REVENUE_NAME);
  const funds = byLatest(revenue.funds ?? [], year);
  return (
    <Section
      id="revenue"
      title={`Төсвийн мөнгө хаанаас ирдэг вэ (${year})`}
      source={
        <>
          Сангийн яам, <SourceLink href="https://www.1212.mn/mn/statistic/statcate/573051/table-view/DT_NSO_0800_003V1">1212.mn, орлого нэр төрлөөр</SourceLink>
          {tax && (
            <>
              ; татвар/ДНБ: <SourceLink href="https://data.worldbank.org/indicator/GC.TAX.TOTL.GD.ZS?locations=MN">Дэлхийн банк</SourceLink>
            </>
          )}
        </>
      }
    >
      <p className="text-sm text-secondary">
        {year} оны тэнцвэржүүлсэн орлого <strong className="text-primary">{mln(total)}</strong>.
        {funds.length > 0 && <> Үүн дээр уул уурхайн орлогоос {funds.map((f) => `${f.name} ${mln(f.value)}`).join(", ")} руу төвлөрүүлсэн.</>}
      </p>
      <ShareBars rows={rows} total={total} format={mln} />
      <YearTable caption="Төсвийн орлого, нэр төрлөөр" years={revenue.years.slice(-5)} rows={rows} format={mln} />
      {tax && tax.series.length > 0 && (
        <>
          <h3 className="pt-2 text-sm font-semibold text-primary">Татварын орлого, ДНБ-ий хувиар</h3>
          <SeriesLineChart data={tax.series} name="Татвар / ДНБ" unit="%" ariaLabel="Татварын орлого, ДНБ-ий хувиар, Дэлхийн банк" />
          <YearTable caption="Татварын орлого, ДНБ-ий хувиар" years={tax.series.slice(-8).map((p) => p.label)} rows={[{ name: "Татвар / ДНБ, %", values: Object.fromEntries(tax.series.map((p) => [p.label, p.value])) }]} format={(v) => (v === null ? "—" : `${v}%`)} />
        </>
      )}
    </Section>
  );
}

function Debt({ nso }: { nso: BudgetNsoSnapshot }) {
  if (nso.debt.length === 0) return null;
  const series = nso.debt.map((d) => ({ label: d.label, value: Math.round(d.value / 10) / 100 }));
  return (
    <Section
      id="debt"
      title="Засгийн газрын нийт өр, улирлаар"
      source={
        <>
          <SourceLink href="https://www.1212.mn/mn/statistic/statcate/573051/table-view/DT_NSO_0700_028V1">1212.mn</SourceLink>
          {nso.updated.debt ? ` · шинэчлэгдсэн ${formatDateMn(nso.updated.debt)}` : ""}
        </>
      }
    >
      <SeriesLineChart data={series} name="Нийт өр" unit="их наяд ₮" ariaLabel="Засгийн газрын нийт өр, их наяд төгрөгөөр, улирлаар" />
      <YearTable
        caption="Засгийн газрын нийт өр"
        years={series.slice(-8).map((p) => p.label)}
        rows={[{ name: "Нийт өр, их наяд ₮", values: Object.fromEntries(series.map((p) => [p.label, p.value])) }]}
        format={(v) => (v === null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: 2 }))}
      />
    </Section>
  );
}

function Shilendans({ s }: { s: ShilendansSnapshot }) {
  const catTotal = s.categories.reduce((a, c) => a + c.amount, 0);
  return (
    <Section
      id="shilendans"
      title={`Шилэн данс: ${s.from.slice(0, 4)} онд хамгийн их төлбөр авсан 10 байгууллага`}
      source={
        <>
          <SourceLink href={SHILENDANS_URL}>Шилэн данс</SourceLink> · {formatDateMn(s.from)} – {formatDateMn(s.to)}
        </>
      }
    >
      <p className="text-sm text-secondary">Төрийн байгууллагуудын Шилэн дансанд нийтэлсэн төлбөрүүдээс хамгийн их мөнгө хүлээн авсан байгууллагууд. Регистрийн дугаараар нь шалгаж болно.</p>
      <ol className="flex flex-col divide-y divide-secondary">
        {s.topPayees.map((p, i) => (
          <li key={`${p.registerNo}-${i}`} className="flex items-baseline justify-between gap-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="mr-2 text-tertiary tabular-nums">{i + 1}.</span>
              <span className="font-medium text-primary">{p.name}</span>
              {p.registerNo && <span className="block pl-6 text-xs text-tertiary">РД {p.registerNo}</span>}
            </span>
            <span className="shrink-0 font-semibold text-primary tabular-nums">{formatMntShort(p.amount)}</span>
          </li>
        ))}
      </ol>
      {s.categories.length > 0 && (
        <>
          <h3 className="pt-2 text-sm font-semibold text-primary">Шилэн дансны зарлага, ангиллаар</h3>
          <ShareBars rows={s.categories.map((c) => ({ name: c.name, value: c.amount }))} total={catTotal} format={formatMntShort} />
        </>
      )}
    </Section>
  );
}

function Audit({ a }: { a: AuditSnapshot }) {
  return (
    <Section
      id="audit"
      title="Үндэсний аудитын газрын сөрөг, татгалзсан, хязгаарлалттай дүгнэлтүүд"
      source={<SourceLink href={AUDIT_URL}>audit.mn, аудитын тайлангийн сан</SourceLink>}
    >
      <ul className="grid gap-3 md:grid-cols-3">
        {OPINIONS.map((o) => (
          <li key={o} className="flex flex-col gap-1 rounded-2xl bg-secondary p-4">
            <p className="text-xs font-semibold text-tertiary">{o}</p>
            <p className="text-xl font-semibold text-primary tabular-nums">{a.totals[o] ?? "—"}</p>
            <p className="text-xs text-tertiary">{OPINION_INFO[o]}</p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-tertiary">Тоо нь audit.mn-ийн бүртгэлд байгаа бүх оны тайлангийн нийлбэр. Доор дүгнэлт тус бүрийн хамгийн сүүлийн тайлангууд.</p>
      {OPINIONS.map((o) => {
        const list = a.reports.filter((r) => r.opinion === o);
        if (list.length === 0) return null;
        return (
          <details key={o} className="text-sm" open={o === OPINIONS[0]}>
            <summary className="cursor-pointer font-semibold text-primary">
              {o} ({list.length})
            </summary>
            <ul className="mt-2 flex flex-col divide-y divide-secondary">
              {list.map((r) => (
                <li key={r.id} className="flex flex-col gap-0.5 py-2">
                  <a href={r.url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                    {sentenceCase(r.title)}
                  </a>
                  <span className="text-xs text-tertiary">{[r.office, r.auditType].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </Section>
  );
}

async function Budget() {
  const [nso, tax, shilendans, audit] = await Promise.all([
    getIndicator<BudgetNsoSnapshot>("budget_nso"),
    getIndicator<TaxShareSnapshot>("worldbank_tax"),
    getIndicator<ShilendansSnapshot>("shilendans"),
    getIndicator<AuditSnapshot>("audit_opinions"),
  ]);
  if (!nso && !shilendans && !audit) {
    return <Empty title="Төсвийн өгөгдөл хараахан татагдаагүй" description="Сангийн яам, ҮСХ, Шилэн данс, Аудитын газрын өгөгдлийг өдөр бүр автоматаар шинэчилнэ." />;
  }
  return (
    <div className="flex flex-col gap-6 pb-10">
      {nso && <History nso={nso.data} />}
      {nso && <Spending nso={nso.data} />}
      {nso && <Revenue nso={nso.data} tax={tax?.data ?? null} />}
      {nso && <Debt nso={nso.data} />}
      {shilendans && <Shilendans s={shilendans.data} />}
      {audit && <Audit a={audit.data} />}
    </div>
  );
}

export default function BudgetPage() {
  return (
    <>
      <PageHeader
        eyebrow="💰 Улсын төсөв"
        title="Татварын мөнгө хаашаа явдаг вэ?"
        description="1990 оноос хойшхи нэгдсэн төсвийн орлого, зарлага, алдагдал, юунд зарцуулсан, хэнд төлсөн, аудит юу гэж дүгнэсэн. Зөвхөн албан ёсны статистик, тоо бүр эх сурвалж руугаа холбогдоно; бид хэнийг ч буруутгахгүй."
      />
      <Suspense fallback={<FeedSkeleton />}>
        <Budget />
      </Suspense>
    </>
  );
}
