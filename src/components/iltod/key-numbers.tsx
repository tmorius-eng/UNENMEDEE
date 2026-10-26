import { keyNumbers } from "@/lib/key-numbers";
import { POPULATION_LABEL } from "@/lib/per-person";
import { cx } from "@/utils/cx";

import { Panel } from "./panel";

/**
 * "Гол тоо": the article's ₮ amounts as a ledger, largest first on the signal chip, each with its
 * share per resident (plain division, never "you pay") and the fact sentence that names it.
 * Server markup; rendered only when the article has amounts.
 */
export function KeyNumbers({ amounts, facts }: { amounts: string[]; facts: string[] }) {
  const rows = keyNumbers(amounts, facts);
  if (rows.length === 0) return null;
  return (
    <Panel title="Гол тоо" note={`AI ялгасан · ${POPULATION_LABEL} хүнд хуваасан`}>
      <ul className="divide-y divide-line-soft">
        {rows.map((r, i) => (
          <li key={r.number + r.unit} className="flex flex-col gap-1.5 py-3 first:pt-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className={cx("num-mono text-2xl leading-none", i === 0 && r.value !== null ? "rounded-md bg-signal px-1.5 py-1 text-signal-ink" : "text-primary")}>
                {r.number}
                {r.unit && <span className={cx("ml-1.5 text-sm font-medium tracking-normal", i === 0 && r.value !== null ? "text-signal-ink/80" : "text-tertiary")}>{r.unit}</span>}
              </span>
              {r.share && (
                <span className="label-mono normal-case text-tertiary" title={`Монголын ${POPULATION_LABEL} оршин суугчид тэнцүү хуваасан дүн`}>
                  👤 {r.share} / хүн
                </span>
              )}
            </div>
            {r.context && <p className="text-sm text-secondary">{r.context}</p>}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
