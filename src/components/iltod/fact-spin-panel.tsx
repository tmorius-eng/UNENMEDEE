"use client";

import { AlertTriangle, CheckVerified01 } from "@untitledui/icons";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { cx } from "@/utils/cx";

import { SpinMeter } from "./spin-meter";

type View = "facts" | "spin";

/** "Баримт vs Пи-Ар Шүүлтүүр": side by side on desktop, toggled on mobile. */
export function FactSpinPanel({ facts, spin, neutrality }: { facts: string[]; spin: string; neutrality: number | null }) {
  const [view, setView] = useState<View>("facts");

  const factsBox = (
    <div className="flex h-full flex-col gap-3 rounded-2xl bg-success-primary p-5 ring-1 ring-green-200 ring-inset dark:ring-green-900">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-success-primary">
        <CheckVerified01 className="size-5" /> Баримт (Facts)
      </h3>
      {facts.length ? (
        <ul className="flex flex-col gap-2 text-sm text-secondary">
          {facts.map((f) => (
            <li key={f} className="flex gap-2">
              <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-success-solid" />
              {f}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-tertiary">Шалгаж болох тодорхой баримт олдсонгүй.</p>
      )}
    </div>
  );

  const spinBox = (
    <div className="flex h-full flex-col gap-3 rounded-2xl bg-warning-primary p-5 ring-1 ring-amber-200 ring-inset dark:ring-amber-900">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-warning-primary">
        <AlertTriangle className="size-5" /> Пи-Ар Шүүлтүүр (Spin Detector)
      </h3>
      <p className="text-sm text-secondary">{spin || "Илэрхий пи-ар илрээгүй."}</p>
      <SpinMeter neutrality={neutrality} size="md" className="mt-auto pt-2" />
    </div>
  );

  return (
    <section aria-label="Баримт ба пи-ар" className="flex flex-col gap-3">
      <div role="tablist" aria-label="Харах хэсэг" className="flex w-fit gap-1 rounded-xl bg-secondary p-1 md:hidden">
        {(["facts", "spin"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            type="button"
            aria-selected={view === v}
            onClick={() => setView(v)}
            className={cx("rounded-lg px-3 py-1.5 text-sm font-semibold transition", view === v ? "bg-primary text-secondary shadow-sm" : "text-quaternary")}
          >
            {v === "facts" ? "Баримт" : "Пи-ар"}
          </button>
        ))}
      </div>
      <div className="hidden gap-4 md:grid md:grid-cols-2">
        {factsBox}
        {spinBox}
      </div>
      <div className="md:hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={view} initial={{ opacity: 0, x: view === "facts" ? -12 : 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {view === "facts" ? factsBox : spinBox}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
