import { Chip } from "@/components/iltod/badges";
import { type Source, SOURCE_KIND_LABEL, sourceKind } from "@/lib/projects";
import { safeHttpUrl } from "@/lib/site";
import { cx } from "@/utils/cx";

/** A fact's page, with who published it: an official body, state media or the press. */
export function SourceLink({ source, className, short = false }: { source: Source; className?: string; short?: boolean }) {
  const href = safeHttpUrl(source.url);
  const kind = sourceKind(source.url);
  const label = short ? source.name.replace(/,.*$/, "").replace(/ \(.*\)$/, "") : source.name;
  return (
    <span className={cx("inline-flex max-w-full flex-wrap items-center gap-1.5", className)}>
      {href ? (
        <a href={href} target="_blank" rel="noreferrer" className="font-medium text-brand-secondary hover:underline">
          {label} ↗
        </a>
      ) : (
        <span>{label}</span>
      )}
      <Chip tone={kind === "official" ? "brand" : "plain"}>{SOURCE_KIND_LABEL[kind]}</Chip>
    </span>
  );
}
