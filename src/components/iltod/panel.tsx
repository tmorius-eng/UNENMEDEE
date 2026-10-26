import { cx } from "@/utils/cx";

/**
 * A ledger panel: a hairline on top, a mono header (title left, an optional note right), then the
 * content. Server markup. For AI-written blocks use AIMessage (the ElevenLabs Message); this is
 * for everything else on the article and data pages (facts, entities, the original text).
 */
export function Panel({ title, note, id, className, children }: { title: React.ReactNode; note?: React.ReactNode; id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-label={typeof title === "string" ? title : undefined} className={cx("flex flex-col gap-3 border-t border-line pt-4", className)}>
      <h2 className="label-mono flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-tertiary">
        <span>{title}</span>
        {note && <span className="normal-case">{note}</span>}
      </h2>
      {children}
    </section>
  );
}
