import { isCeremonial } from "@/lib/ai/ceremony";
import type { ReaderImpact } from "@/lib/types";
import { cx } from "@/utils/cx";

import { AIMessage } from "./ai-message";

/**
 * "Танд хамаатай юу?" (Oct 2026 mission audit): who a story touches, what changes for them, from
 * when and what to do, as Tier 1 read it from the text (src/lib/ai/reader-view.ts drops any field
 * with a number the text never printed). Plain markup, no client JS: the article page renders it
 * on the server and StoryList (a client component) ships only this little bit.
 */
const ROWS: { key: keyof ReaderImpact; icon: string; label: string }[] = [
  { key: "who", icon: "👤", label: "Хэнд" },
  { key: "change", icon: "↻", label: "Юу өөрчлөгдөх" },
  { key: "when", icon: "📅", label: "Хэзээнээс" },
  { key: "action", icon: "✓", label: "Юу хийх" },
];

export function ReaderImpactBlock({ impact, compact = false, className }: { impact: ReaderImpact; compact?: boolean; className?: string }) {
  const rows = ROWS.filter((r) => impact[r.key]);
  return (
    <AIMessage compact={compact} tier="tier1" title="Танд хамаатай юу?" note="Эх текстэд байгаагаар, AI" className={className}>
      {/* Label above the text on phones (a label column took half of a 390 px screen), side by side from sm. */}
      <dl className="mt-2 flex flex-col gap-3 text-md sm:grid sm:grid-cols-[auto_1fr] sm:gap-x-4 sm:gap-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex flex-col gap-0.5 sm:contents">
            <dt className="label-mono flex items-center gap-1.5 whitespace-nowrap text-tertiary sm:pt-[0.2em]">
              <span aria-hidden className="w-4 text-center normal-case">
                {r.icon}
              </span>
              {r.label}
            </dt>
            <dd className={cx("text-primary", r.key === "who" && "font-semibold")}>{impact[r.key]}</dd>
          </div>
        ))}
      </dl>
    </AIMessage>
  );
}

/** A meeting, visit, opening or report with no decision in its headline (src/lib/ai/ceremony.ts). Rule-based, not AI. */
export function isProtocolStory(s: { title: string; sourceTitle: string | null; impact: ReaderImpact | null }): boolean {
  return !s.impact && isCeremonial(s.sourceTitle ?? s.title);
}

export function ProtocolNote({ className }: { className?: string }) {
  return (
    <p className={cx("rounded-xl bg-secondary px-4 py-3 text-sm text-secondary ring-1 ring-line-soft ring-inset", className)}>
      <span className="label-mono mr-2 text-tertiary">Протоколын мэдээ</span>
      Болсон үйл явдлыг (уулзалт, айлчлал, нээлт, хурал, тайлан) мэдээлсэн. Гарчигт нь шийдвэр, мөнгөн дүн, хэрэгжих хугацаа дурдаагүй.
    </p>
  );
}

/** The one-line "Танд" hint under a collapsed story row: who, and what changes for them. */
export function impactTeaser(impact: ReaderImpact | null): { who: string | null; text: string } | null {
  if (!impact) return null;
  const text = impact.change ?? impact.action;
  return text ? { who: impact.who, text } : null;
}
