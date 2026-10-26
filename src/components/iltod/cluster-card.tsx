import { LayersThree01 } from "@untitledui/icons";
import Link from "next/link";

import type { ClusterListItem } from "@/lib/queries";

import { RiskBadge } from "./badges";
import { TimeAgo } from "./time-ago";

export function ClusterCard({ cluster }: { cluster: ClusterListItem }) {
  return (
    <Link
      href={`/clusters/${cluster.id}`}
      className="group flex flex-col gap-3 rounded-2xl bg-primary p-5 ring-1 ring-line transition ring-inset hover:ring-brand"
    >
      <div className="label-mono flex items-center gap-2 text-tertiary">
        <LayersThree01 className="size-4" /> {cluster.articleCount} мэдээ · <TimeAgo date={cluster.updatedAt} />
        <span className="ml-auto">{cluster.maxRiskScore >= 35 && <RiskBadge score={cluster.maxRiskScore} />}</span>
      </div>
      <h3 className="story-headline text-balance text-primary group-hover:text-brand-secondary">{cluster.title}</h3>
      {cluster.synthesis && <p className="line-clamp-4 text-sm text-secondary">{cluster.synthesis}</p>}
      {cluster.sources.length > 0 && (
        <p className="mt-auto pt-2 text-xs text-tertiary">Эх сурвалж: {cluster.sources.slice(0, 4).join(", ")}{cluster.sources.length > 4 ? "…" : ""}</p>
      )}
    </Link>
  );
}
