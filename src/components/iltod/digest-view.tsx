import Link from "next/link";

import { Badge } from "@/components/base/badges/badges";
import { formatPeriodMn } from "@/lib/format";
import type { DigestView as Digest } from "@/lib/queries";

import { AIMessage } from "./ai-message";
import { RiskBadge } from "./badges";
import { DigestProgress, TrackedLink, TrackedNumber } from "./digest-progress";

const KIND_LABEL: Record<string, string> = { "12h": "12 цагийн тойм", "30d": "30 хоногийн тойм" };

/**
 * An AI editor's digest, rendered as an ElevenLabs <Message> like every other AI text.
 * `compact` shows the top stories only (home page); `track` adds the reading progress and
 * streak (newest edition on /digest only, so the home page ships no extra JS).
 */
export function DigestView({ digest, compact = false, track = false }: { digest: Digest; compact?: boolean; track?: boolean }) {
  const items = compact ? digest.items.slice(0, 5) : digest.items;
  const ids = items.map((it) => it.articleId);
  const byAI = digest.generatedBy !== "rule-based";
  return (
    <AIMessage tier="tier1" title={`${KIND_LABEL[digest.kind] ?? "Тойм"} · ${formatPeriodMn(digest.periodStart, digest.periodEnd)}`}>
      <div className="mt-2 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="text-lg font-semibold text-balance text-primary md:text-xl">{digest.title}</h3>
          <p className="text-sm text-secondary">{digest.intro}</p>
        </div>
        {track && <DigestProgress ids={ids} edition={digest.id} />}
        <ol className="flex flex-col gap-3">
          {items.map((it, i) => (
            <li key={it.articleId} className="flex gap-3">
              {track ? (
                <TrackedNumber id={it.articleId} n={i + 1} />
              ) : (
                <span aria-hidden className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-solid text-xs font-semibold text-primary_on-brand">
                  {i + 1}
                </span>
              )}
              <div className="flex min-w-0 flex-col gap-1">
                {track ? (
                  <TrackedLink id={it.articleId} ids={ids} href={`/article/${it.slug}`}>
                    {it.headline}
                  </TrackedLink>
                ) : (
                  <Link href={`/article/${it.slug}`} className="font-semibold text-primary hover:text-brand-secondary hover:underline">
                    {it.headline}
                  </Link>
                )}
                {it.whyItMatters && <p className="text-sm text-secondary">{it.whyItMatters}</p>}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-tertiary">
                  <span>{it.sourceName}</span>
                  {it.otherSources > 0 && (
                    <Badge type="pill-color" color="gray" size="sm">
                      +{it.otherSources} эх сурвалж
                    </Badge>
                  )}
                  {it.riskScore >= 65 && <RiskBadge score={it.riskScore} />}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-quaternary">
          {byAI
            ? `${digest.candidateCount} мэдээнээс AI редактор (${digest.generatedBy}) сонгосон. Гарчиг бүр эх мэдээ рүү холбогдоно.`
            : `${digest.candidateCount} мэдээг ач холбогдол, эрсдэл, олон эх сурвалжид гарсан байдлаар нь автоматаар эрэмбэлсэн.`}
          {compact && digest.items.length > items.length && (
            <>
              {" "}
              <Link href="/digest" className="font-semibold text-brand-secondary hover:underline">
                Бүх {digest.items.length} мэдээг харах →
              </Link>
            </>
          )}
        </p>
      </div>
    </AIMessage>
  );
}
