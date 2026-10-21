import { FileSearch02 } from "@untitledui/icons";

/**
 * Empty state in Untitled UI's look (modern featured icon, title, description) without the
 * EmptyState component: its illustrations and background patterns weigh ~200 KB of client JS,
 * which every page importing this file (the home page included) had to download.
 */
export function Empty({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl bg-primary px-6 py-12 text-center ring-1 ring-secondary ring-inset">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-fg-brand-primary shadow-xs ring-1 ring-primary ring-inset">
        <FileSearch02 className="size-6" />
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <p className="text-md font-semibold text-primary">{title}</p>
        <p className="text-sm text-tertiary">{description}</p>
      </div>
      {children && <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
