import type { ReactNode } from "react";

/** Every public page's top: a mono kicker, a display headline and a short intro. */
export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 border-b border-line pb-6 mb-8">
      {eyebrow && <p className="label-mono text-brand-secondary">{eyebrow}</p>}
      <h1 className="headline text-[1.875rem] text-primary md:text-[2.5rem]">{title}</h1>
      {description && <p className="max-w-3xl text-md text-secondary">{description}</p>}
      {children}
    </header>
  );
}
