import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 pb-8">
      {eyebrow && <p className="text-sm font-semibold text-brand-secondary">{eyebrow}</p>}
      <h1 className="text-display-xs font-semibold tracking-tight text-balance text-primary md:text-display-sm">{title}</h1>
      {description && <p className="max-w-3xl text-md text-tertiary">{description}</p>}
      {children}
    </header>
  );
}
