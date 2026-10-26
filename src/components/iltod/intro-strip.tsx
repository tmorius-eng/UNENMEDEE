import Link from "next/link";

import { IntroDismiss } from "./intro-dismiss";

/** localStorage key set by "Ойлголоо"; read before paint by the inline script in the root layout. */
export const INTRO_KEY = "iltod-intro";

/**
 * A three-step "what is this site" strip for first-time visitors on `/`. Server markup; returning
 * readers never see it, and it never shifts the layout: the root layout's inline script sets
 * `data-intro="seen"` on <html> before the first paint, and CSS hides `.intro-strip`.
 */
export function IntroStrip({ sources }: { sources: number }) {
  const steps = [
    { n: "01", text: `${sources || 95} төрийн сайтыг цаг тутам уншина` },
    { n: "02", text: "AI баримтыг пи-араас салгана" },
    { n: "03", text: "Та эх сурвалжаас нь шалгана" },
  ];
  return (
    <section aria-label="ИЛ ТОД МЭДЭЭ гэж юу вэ" className="intro-strip rounded-2xl bg-secondary p-3.5 ring-1 ring-line-soft ring-inset">
      <ol className="grid grid-cols-3 gap-3">
        {steps.map((s) => (
          <li key={s.n} className="flex flex-col gap-1 text-xs font-medium text-secondary sm:text-sm">
            <span aria-hidden className="num-mono text-brand-secondary">
              {s.n}
            </span>
            {s.text}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line-soft pt-3">
        <Link href="/method" className="text-sm font-semibold text-brand-secondary hover:underline">
          Яаж ажилладаг вэ →
        </Link>
        <IntroDismiss storageKey={INTRO_KEY} />
      </div>
    </section>
  );
}
