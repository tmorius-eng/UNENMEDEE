import Link from "next/link";

import { Chip } from "@/components/iltod/badges";
import { formatMntShort } from "@/lib/format";
import { KIND_LABEL, latestBudget, officialSpent, perPerson, type Project, sinceLabel, whenLabel } from "@/lib/projects";

import { StageLadder } from "./stage-ladder";

function plannedLabel(p: Project): string | null {
  if (!p.planned) return null;
  return p.planned.currency === "USD" ? `${(p.planned.amount / 1e9).toLocaleString("en-US", { maximumFractionDigits: 2 })} тэрбум $` : formatMntShort(p.planned.amount);
}

/** The ledger: one hairline row per project, the whole row a link to its page. */
export function ProjectRows({ projects, today }: { projects: Project[]; today: Date }) {
  return (
    <ol className="flex flex-col divide-y divide-line border-y border-line">
      {projects.map((p) => {
        const spent = officialSpent(p);
        const latest = latestBudget(p);
        const latestSum = latest.reduce((a, b) => a + b.amount, 0);
        const share = spent ? perPerson(spent) : null;
        return (
          <li key={p.slug}>
            <Link href={`/projects/${p.slug}`} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 py-4 transition hover:bg-primary_hover sm:grid-cols-[1fr_8rem_7rem] sm:items-center">
              <div className="flex min-w-0 flex-col gap-1">
                <p className="flex flex-wrap items-center gap-2">
                  <span className="story-headline text-md text-primary">{p.name}</span>
                  <Chip>{KIND_LABEL[p.kind]}</Chip>
                </p>
                <p className="label-mono normal-case text-tertiary">
                  Зарласнаас хойш {sinceLabel(p.announced.date, today)} · {whenLabel(p.announced.date)}
                </p>
                <p className="text-xs text-secondary">
                  {plannedLabel(p) ? `Төлөвлөсөн өртөг ${plannedLabel(p)}` : "Төлөвлөсөн өртөг: албан дүн олдсонгүй"}
                  {latestSum > 0 ? ` · ${latest[0].year} оны төсөв ${formatMntShort(latestSum)}` : ""}
                </p>
              </div>
              <div className="row-start-2 flex flex-col sm:row-start-auto">
                <span className="label-mono text-tertiary">Албан гүйцэтгэл</span>
                <span className="num-mono text-md text-primary">{spent ? formatMntShort(spent) : "—"}</span>
                {share && <span className="text-xs text-tertiary">{share} / хүн</span>}
              </div>
              <div className="col-start-2 row-start-1 sm:col-start-auto sm:row-start-auto">
                <StageLadder project={p} compact />
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
