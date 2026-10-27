import Link from "next/link";

import { formatPeriodMn } from "@/lib/format";
import type { DigestView as Digest } from "@/lib/queries";

import { AIMessage } from "./ai-message";
import { DigestProgress } from "./digest-progress";
import { DigestStories } from "./digest-stories";

const KIND_LABEL: Record<string, string> = { "12h": "12 цагийн тойм", "30d": "30 хоногийн тойм" };

/**
 * An AI editor's digest, rendered as an ElevenLabs <Message> like every other AI text: a mono
 * header (kind · period, the editor model on the right), a display title, numbered stories with
 * "why it matters" that open in place (`DigestStories`). `compact` shows the top stories only (home page); `track` adds the reading
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
        <DigestStories edition={digest.id} items={items} track={track} />
        <p className="text-xs text-tertiary">
          {byAI
            ? `${digest.candidateCount} мэдээнээс AI редактор (${digest.generatedBy}) сонгосон. Гарчиг дээр дарахад хураангуй нь энд нээгдэнэ.`
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
