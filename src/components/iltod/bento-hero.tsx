"use client";

import { AlertTriangle, ArrowUpRight, Database01, LayersThree01, ShieldTick } from "@untitledui/icons";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "motion/react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ShimmeringText } from "@/components/ui/shimmering-text";
import { formatNumber, formatUsd } from "@/lib/format";
import type { ArticleListItem, ClusterListItem, SiteStats } from "@/lib/queries";
import { cx } from "@/utils/cx";

import { RiskBadge, SourceBadge } from "./badges";
import { OrbAccent } from "./orb-accent";

/** Card with a cursor-following glow and a subtle lift (disabled for reduced motion). */
function GlowCard({
  children,
  className,
  span,
  href,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** Grid placement classes: applied to the outermost element (the grid item). */
  span?: string;
  href?: string;
  delay?: number;
}) {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const reduce = useReducedMotion();
  const glow = useMotionTemplate`radial-gradient(320px circle at ${x}px ${y}px, color-mix(in oklab, var(--color-brand-500) 18%, transparent), transparent 70%)`;
  const body = (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={reduce ? undefined : { y: -4 }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set(e.clientX - r.left);
        y.set(e.clientY - r.top);
      }}
      onPointerLeave={() => {
        x.set(-200);
        y.set(-200);
      }}
      className={cx(
        "group relative h-full overflow-hidden rounded-3xl bg-primary p-6 ring-1 ring-secondary ring-inset transition-shadow hover:shadow-2xl",
        className,
      )}
    >
      <motion.div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: glow }} />
      <div className="relative flex h-full flex-col">{children}</div>
    </motion.div>
  );
  return href ? (
    <Link href={href} className={cx("block h-full rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring", span)}>
      {body}
    </Link>
  ) : (
    <div className={span}>{body}</div>
  );
}

function Stat({ icon: Icon, value, label }: { icon: typeof ShieldTick; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-brand-secondary text-fg-brand-primary">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xl font-semibold text-primary tabular-nums">{value}</p>
        <p className="text-xs text-tertiary">{label}</p>
      </div>
    </div>
  );
}

export function BentoHero({ stats, topRisk, topClusters }: { stats: SiteStats; topRisk: ArticleListItem[]; topClusters: ClusterListItem[] }) {
  const lead = topClusters[0];
  return (
    <section aria-label="Онцлох" className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 md:grid-cols-6">
      {/* Mission + orb */}
      <GlowCard span="md:col-span-4 md:row-span-2" className="bg-linear-to-br from-brand-primary via-primary to-primary" delay={0}>
        <div className="flex h-full flex-col gap-6 md:flex-row md:items-center">
          <div className="flex flex-1 flex-col gap-4">
            <span className="w-fit rounded-full bg-primary/70 px-3 py-1 text-xs font-semibold text-brand-secondary ring-1 ring-brand ring-inset backdrop-blur">
              Нээлттэй эх · 0₮ дэд бүтэц · AI шүүлтүүр
            </span>
            <h1 className="text-display-sm font-semibold tracking-tight text-balance text-primary md:text-display-md">
              Төрийн мэдээ. <span className="bg-linear-to-r from-brand-600 to-fuchsia-500 bg-clip-text text-transparent">Пи-аргүй.</span>
            </h1>
            <p className="max-w-xl text-md text-secondary">
              {formatNumber(stats.activeSources)} төрийн сайтыг автоматаар уншиж, баримтыг пи-араас салгаж, эрсдэлтэй тендер, төсвийг AI-аар шүүдэг ил тод платформ.
            </p>
            <ShimmeringText text="DeepSeek + Grok шинжилгээ идэвхтэй…" className="text-sm font-medium" duration={2.5} />
          </div>
          <OrbAccent className="mx-auto size-40 shrink-0 md:size-56" state="thinking" />
        </div>
      </GlowCard>

      {/* Stats */}
      <GlowCard span="md:col-span-2" delay={0.08}>
        <div className="grid h-full grid-cols-2 gap-4 md:grid-cols-1">
          <Stat icon={Database01} value={formatNumber(stats.analyzed)} label="AI-аар шүүсэн мэдээ" />
          <Stat icon={AlertTriangle} value={formatNumber(stats.flagged)} label="Өндөр эрсдэлтэй" />
        </div>
      </GlowCard>
      <GlowCard span="md:col-span-2" href="/transparency" delay={0.12}>
        <p className="text-xs font-semibold tracking-wide text-tertiary uppercase">Энэ сарын AI зардал</p>
        <p className="mt-2 text-display-xs font-semibold text-primary tabular-nums">{formatUsd(stats.aiCostThisMonthUsd)}</p>
        <p className="mt-auto flex items-center gap-1 pt-3 text-sm font-semibold text-brand-secondary">
          Сервер: $0.00 · Тайлан харах <ArrowUpRight className="size-4" />
        </p>
      </GlowCard>

      {/* Lead cluster */}
      {lead ? (
        <GlowCard span="md:col-span-3" href={`/clusters/${lead.id}`} delay={0.16}>
          <div className="flex items-center gap-2 text-xs font-semibold text-tertiary">
            <LayersThree01 className="size-4" /> {lead.articleCount} эх сурвалж нэг сэдвээр
          </div>
          <h2 className="mt-3 text-lg font-semibold text-balance text-primary">{lead.title}</h2>
          {lead.synthesis && <p className="mt-2 line-clamp-3 text-sm text-secondary">{lead.synthesis}</p>}
          <div className="mt-auto pt-4">{lead.maxRiskScore >= 35 && <RiskBadge score={lead.maxRiskScore} />}</div>
        </GlowCard>
      ) : (
        <GlowCard span="md:col-span-3" delay={0.16}>
          <div className="flex items-center gap-2 text-xs font-semibold text-tertiary">
            <LayersThree01 className="size-4" /> Кластер сэдэв
          </div>
          <p className="mt-3 text-sm text-secondary">Олон эх сурвалж нэг сэдвийг мэдээлэхэд энд нэгтгэж харуулна.</p>
        </GlowCard>
      )}

      {/* Risk alerts */}
      <GlowCard span="md:col-span-3" href="/risk" delay={0.2}>
        <div className="flex items-center gap-2 text-xs font-semibold text-error-primary">
          <AlertTriangle className="size-4" /> Эрсдэлийн дохио
        </div>
        {topRisk.length ? (
          <ul className="mt-3 flex flex-col gap-3">
            {topRisk.slice(0, 3).map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <RiskBadge score={a.riskScore} />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-medium text-primary">{a.title}</p>
                  <div className="mt-1">
                    <SourceBadge domain={a.sourceDomain} category={a.sourceCategory} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-secondary">Одоогоор өндөр эрсдэлтэй тендер, төсөв илрээгүй байна.</p>
        )}
      </GlowCard>
    </section>
  );
}
