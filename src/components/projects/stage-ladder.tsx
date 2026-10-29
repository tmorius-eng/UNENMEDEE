import { type Project, stageIndex, STAGES, whenLabel } from "@/lib/projects";
import { cx } from "@/utils/cx";

import { SourceLink } from "./source-link";

/**
 * Five hairline segments filled up to the stage an official statement supports, the statement under
 * it with its source. Plain markup: the list page draws the small one, the detail page the labelled one.
 */
export function StageLadder({ project, compact = false }: { project: Project; compact?: boolean }) {
  const level = stageIndex(project.stage.level);
  const label = STAGES[level]?.label ?? project.stage.level;
  return (
    <div className={cx("flex flex-col", compact ? "gap-1" : "gap-2")}>
      <ol className={cx("flex gap-1", compact ? "w-24" : "w-full")} aria-label={`Үе шат: ${label}`}>
        {STAGES.map((s, i) => (
          <li key={s.key} className="flex min-w-0 flex-1 flex-col gap-1">
            <span aria-hidden className={cx("block rounded-sm", compact ? "h-1.5" : "h-2", i <= level ? "bg-brand-solid" : "bg-secondary ring-1 ring-line ring-inset")} />
            {!compact && <span className={cx("label-mono truncate text-[10px]", i === level ? "text-brand-secondary" : "text-quaternary")}>{s.short}</span>}
          </li>
        ))}
      </ol>
      {compact ? (
        <span className="label-mono truncate text-tertiary">{label}</span>
      ) : (
        <div className="flex flex-col gap-1 text-sm">
          <p className="font-semibold text-primary">{label}</p>
          <p className="text-secondary">{project.stage.basis}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-tertiary">
            <span>Үндэслэл ({whenLabel(project.stage.asOf)}):</span>
            <SourceLink source={project.stage.source} />
          </p>
        </div>
      )}
    </div>
  );
}
