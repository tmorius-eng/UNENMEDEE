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
    { icon: "🏛️", text: `${sources || 95} төрийн сайтыг 2 цаг тутам уншина` },
    { icon: "🤖", text: "AI баримтыг пи-араас салгана" },
    { icon: "🔍", text: "Та эх сурвалжаас нь шалгана" },
  ];
  return (
    <section aria-label="ИЛ ТОД МЭДЭЭ гэж юу вэ" className="intro-strip rounded-2xl bg-brand-primary_alt p-3 ring-1 ring-brand ring-inset">
      <ol className="grid grid-cols-3 gap-2">
        {steps.map((s) => (
          <li key={s.icon} className="flex flex-col items-center gap-1 text-center text-xs font-medium text-secondary sm:flex-row sm:text-left sm:text-sm">
            <span aria-hidden className="text-lg">
              {s.icon}
            </span>
            {s.text}
          </li>
        ))}
      </ol>
      <div className="mt-2 flex items-center justify-between gap-3">
        <Link href="/method" className="text-sm font-semibold text-brand-secondary hover:underline">
          Яаж ажилладаг вэ →
        </Link>
        <IntroDismiss storageKey={INTRO_KEY} />
      </div>
    </section>
  );
}
