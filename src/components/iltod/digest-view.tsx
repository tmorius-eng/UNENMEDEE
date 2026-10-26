import Link from "next/link";

import { formatPeriodMn } from "@/lib/format";
import type { DigestView as Digest } from "@/lib/queries";

import { AIMessage } from "./ai-message";
import { Chip, RiskBadge } from "./badges";
import { DigestProgress, TrackedLink, TrackedNumber } from "./digest-progress";

const KIND_LABEL: Record<string, string> = { "12h": "12 цагийн тойм", "30d": "30 хоногийн тойм" };

/**
 * An AI editor's digest, rendered as an ElevenLabs <Message> like every other AI text: a mono
 * header (kind · period, the editor model on the right), a display title, numbered stories with
 * "why it matters". `compact` shows the top stories only (home page); `track` adds the reading
 * progress and streak (newest edition on /digest only, so the home page ships no extra JS).
 */
export function DigestView({ digest, compact = false, track = false }: { digest: Digest; compact?: boolean; track?: boolean }) {
  const items = compact ? digest.items.slice(0, 5) : digest.items;
  const ids = items.map((it) => it.articleId);
  const byAI = digest.generatedBy !== "rule-based";
  return (
    <AIMessage tier="tier1" title={`${KIND_LABEL[digest.kind] ?? "Тойм"} · ${formatPeriodMn(digest.periodStart, digest.periodEnd)}`} note={byAI ? digest.generatedBy : "дүрмээр эрэмбэлсэн"}>
      <div className="mt-2 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h3 className="headline text-[1.375rem] text-primary md:text-2xl">{digest.title}</h3>
          <p className="text-sm text-secondary">{digest.intro}</p>
        </div>
        {track && <DigestProgress ids={ids} edition={digest.id} />}
        <ol className="flex flex-col divide-y divide-line-soft">
          {items.map((it, i) => (
            <li key={it.articleId} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              {track ? (
                <TrackedNumber id={it.articleId} n={i + 1} />
              ) : (
                <span aria-hidden className="num-mono mt-0.5 w-7 shrink-0 text-lg leading-none text-brand-secondary">
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
              <div className="flex min-w-0 flex-col gap-1">
                {track ? (
                  <TrackedLink id={it.articleId} ids={ids} href={`/article/${it.slug}`}>
                    {it.headline}
                  </TrackedLink>
                ) : (
                  <Link href={`/article/${it.slug}`} className="font-display text-md font-bold tracking-[-0.02em] text-primary hover:text-brand-secondary hover:underline">
                    {it.headline}
                  </Link>
                )}
                {it.whyItMatters && (
                  <p className="text-sm text-secondary">
                    <span className="font-semibold text-primary">Яагаад чухал вэ: </span>
                    {it.whyItMatters}
                  </p>
                )}
                <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <span className="label-mono normal-case text-tertiary">{it.sourceName}</span>
                  {it.otherSources > 0 && <Chip tone="brand">+{it.otherSources} эх сурвалж</Chip>}
                  {it.riskScore >= 65 && <RiskBadge score={it.riskScore} />}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-xs text-tertiary">
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
