import { CpuChip01, Database01, Server03, ShieldTick } from "@untitledui/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { DailySpendChart, LedgerChart } from "@/components/iltod/charts";
import { PageHeader } from "@/components/iltod/page-header";
import { budgetConfig } from "@/lib/ai/limits";
import { getPrice } from "@/lib/ai/pricing";
import { formatNumber, formatUsd } from "@/lib/format";
import { getSiteStats, getTransparency } from "@/lib/queries";
import { REPO_URL } from "@/lib/site";
import type { AIProvider } from "@/lib/types";

export const metadata: Metadata = {
  title: "Ил тод байдлын тайлан — зардал, орлого",
  alternates: { canonical: "/transparency" },
  description: "Серверийн зардал, AI токен бүрийн зардал, зар сурталчилгаа, хандивын орлогыг шууд мэдээллийн сангаас харуулна.",
};

function Tile({ icon: Icon, label, value, hint }: { icon: typeof Server03; label: string; value: string; hint: string }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-primary p-5 ring-1 ring-secondary ring-inset">
      <div className="flex items-center gap-2 text-sm font-medium text-tertiary">
        <Icon className="size-5 text-fg-brand-primary" /> {label}
      </div>
      <p className="text-display-xs font-semibold text-primary tabular-nums">{value}</p>
      <p className="text-xs text-tertiary">{hint}</p>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-3xl bg-primary p-6 ring-1 ring-secondary ring-inset">
      <div>
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        {description && <p className="text-sm text-tertiary">{description}</p>}
      </div>
      {children}
    </section>
  );
}

const PROVIDER_LABEL: Record<string, string> = {
  deepseek: "DeepSeek (Tier 1)",
  grok: "xAI Grok (Tier 2)",
  gemini: "Google Gemini (үнэгүй хувилбар)",
  nvidia: "NVIDIA NIM · Gemma (үнэгүй)",
  groq: "Groq · Qwen (үнэгүй)",
  requesty: "Requesty · Gemma (үнэгүй загвар)",
  ollama: "Ollama (локал, 0$)",
};

async function Dashboard() {
  const [data, stats] = await Promise.all([getTransparency(), getSiteStats()]);
  const limits = budgetConfig();
  const ledgerRows = [...data.ledger].reverse().map((l) => ({
    month: l.month,
    expenses: l.infraCostUsd + l.aiCostUsd,
    income: l.adRevenueUsd + l.donationsUsd,
  }));
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tile icon={Server03} label="Серверийн зардал" value="$0.00" hint="Vercel Hobby + Supabase Free + үнэгүй автомат ажлын сервер" />
        <Tile icon={CpuChip01} label="Нийт AI зардал" value={formatUsd(data.totals.costUsd)} hint={`${formatNumber(data.totals.calls)} дуудлага · ${formatNumber(data.totals.tokens)} токен`} />
        <Tile icon={Database01} label="Уншсан төрийн хуудас" value={formatNumber(stats.articles)} hint={`${formatNumber(stats.analyzed)} нь AI-аар шүүгдсэн`} />
        <Tile
          icon={ShieldTick}
          label="Энэ сарын AI зардал"
          value={formatUsd(stats.aiCostThisMonthUsd)}
          hint={`Хатуу хязгаар: сард ${formatUsd(limits.monthlyUsd)}, өдөрт ${formatUsd(limits.dailyUsd)}. Хэтэрвэл зөвхөн үнэгүй AI ажиллана.`}
        />
      </div>

      <Panel
        title="Өдөр бүрийн төлбөртэй AI зардал"
        description="Сүүлийн 30 хоног, токен бүрийн бодит үнээр. Үнэгүй AI (Groq, Gemini, NVIDIA, Ollama) $0 тул графикт биш, доорх хүснэгтэд харагдана."
      >
        {data.dailySpend.length ? (
          <DailySpendChart data={data.dailySpend} />
        ) : (
          <p className="text-sm text-tertiary">Төлбөртэй AI ашиглаагүй байна: бүх шинжилгээ үнэгүй AI-аар хийгдсэн.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">AI үйлчилгээ үзүүлэгчээр задалсан зардал</caption>
            <thead className="border-b border-secondary text-xs text-tertiary">
              <tr>
                <th className="py-2 pr-4 font-semibold">Үйлчилгээ</th>
                <th className="py-2 pr-4 text-right font-semibold">Дуудлага</th>
                <th className="py-2 pr-4 text-right font-semibold">Оролтын токен</th>
                <th className="py-2 pr-4 text-right font-semibold">Гаралтын токен</th>
                <th className="py-2 pr-4 text-right font-semibold">Үнэ / 1M (оролт · гаралт)</th>
                <th className="py-2 text-right font-semibold">Зардал</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary">
              {data.byProvider.map((p) => {
                const price = getPrice(p.provider as AIProvider);
                return (
                  <tr key={p.provider}>
                    <td className="py-2 pr-4 font-medium text-primary">{PROVIDER_LABEL[p.provider] ?? p.provider}</td>
                    <td className="py-2 pr-4 text-right text-secondary tabular-nums">{formatNumber(p.calls)}</td>
                    <td className="py-2 pr-4 text-right text-secondary tabular-nums">{formatNumber(p.promptTokens)}</td>
                    <td className="py-2 pr-4 text-right text-secondary tabular-nums">{formatNumber(p.completionTokens)}</td>
                    <td className="py-2 pr-4 text-right text-tertiary tabular-nums">
                      ${price.input} · ${price.output}
                    </td>
                    <td className="py-2 text-right font-semibold text-primary tabular-nums">{formatUsd(p.costUsd, 4)}</td>
                  </tr>
                );
              })}
              {data.byProvider.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-tertiary">
                    Мэдээлэл алга.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Зардал ба орлого (сар бүр)" description="Зар сурталчилгаа, олон нийтийн хандивын орлогыг админ гараар бүртгэдэг. AI зардал автоматаар тооцогдоно.">
        {ledgerRows.length ? <LedgerChart data={ledgerRows} /> : <p className="text-sm text-tertiary">Санхүүгийн бүртгэл хараахан алга.</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Сар бүрийн санхүүгийн бүртгэл</caption>
            <thead className="border-b border-secondary text-xs text-tertiary">
              <tr>
                <th className="py-2 pr-4 font-semibold">Сар</th>
                <th className="py-2 pr-4 text-right font-semibold">Сервер</th>
                <th className="py-2 pr-4 text-right font-semibold">AI</th>
                <th className="py-2 pr-4 text-right font-semibold">Зар</th>
                <th className="py-2 pr-4 text-right font-semibold">Хандив</th>
                <th className="py-2 font-semibold">Тайлбар</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary">
              {data.ledger.map((l) => (
                <tr key={l.month}>
                  <td className="py-2 pr-4 font-medium text-primary">{l.month}</td>
                  <td className="py-2 pr-4 text-right text-secondary tabular-nums">{formatUsd(l.infraCostUsd)}</td>
                  <td className="py-2 pr-4 text-right text-secondary tabular-nums">{formatUsd(l.aiCostUsd, 4)}</td>
                  <td className="py-2 pr-4 text-right text-secondary tabular-nums">{formatUsd(l.adRevenueUsd)}</td>
                  <td className="py-2 pr-4 text-right text-secondary tabular-nums">{formatUsd(l.donationsUsd)}</td>
                  <td className="py-2 text-tertiary">{l.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Яаж шалгах вэ?">
        <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-secondary">
          <li>AI дуудлага бүр (амжилттай эсвэл алдаатай) токены тоо, үнийн хамт <code>ai_usage_logs</code> хүснэгтэд бичигдэнэ.</li>
          <li>Зардлыг үйлчилгээ үзүүлэгч бүрийн албан ёсны үнээр (1 сая токен тутамд) тооцно; үнэгүй квотоор хийсэн дуудлага $0.</li>
          <li>Скрапер, AI pipeline 2 цаг тутам автоматаар ажиллаж, ажил бүрийн бүртгэл GitHub Actions дээр нээлттэй хадгалагдана.</li>
          <li>
            Бүх код, AI-д өгдөг заавар нээлттэй:{" "}
            <a className="font-semibold text-brand-secondary hover:underline" href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>{" "}
            ·{" "}
            <Link className="font-semibold text-brand-secondary hover:underline" href="/method">
              Арга зүй
            </Link>
          </li>
        </ul>
      </Panel>
    </div>
  );
}

export default function TransparencyPage() {
  return (
    <>
      <PageHeader
        eyebrow="📊 100% ил тод"
        title="Ил тод байдлын тайлан"
        description="Бид хэр их мөнгө зарцуулж, хаанаас орлого олж байгаагаа токен бүрийн нарийвчлалтай нийтэлдэг. Бүх тоо мэдээллийн сангаас шууд гарна."
      />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-primary ring-1 ring-secondary ring-inset" />}>
        <Dashboard />
      </Suspense>
    </>
  );
}
