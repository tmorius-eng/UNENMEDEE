import Link from "next/link";

import type { ArticleListItem } from "@/lib/queries";
import { tldrSentences } from "@/lib/format";
import { cx } from "@/utils/cx";

import { DeepBadge, MoneyTags, RiskBadge, SourceBadge } from "./badges";
import { SpinMeter } from "./spin-meter";
import { TimeAgo } from "./time-ago";

export function ArticleCard({ article, className }: { article: ArticleListItem; className?: string }) {
  const bullets = tldrSentences(article.tldr);
  return (
    <article
      className={cx(
        "group relative flex flex-col gap-4 rounded-2xl bg-primary p-5 ring-1 ring-secondary transition duration-300 ring-inset hover:-translate-y-0.5 hover:shadow-xl hover:ring-brand",
        article.riskFlag && "ring-error_subtle",
        className,
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <SourceBadge domain={article.sourceDomain} category={article.sourceCategory} />
        <TimeAgo date={article.publishedAt} className="text-xs text-tertiary" />
        <span className="ml-auto flex items-center gap-1.5">
          {article.hasDeepAnalysis && <DeepBadge />}
          {article.riskScore >= 35 && <RiskBadge score={article.riskScore} />}
        </span>
      </header>

      <h3 className="text-lg leading-snug font-semibold text-balance text-primary">
        <Link href={`/article/${article.slug}`} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none">
          {article.title}
        </Link>
      </h3>

      {bullets.length > 0 && (
        <ul className="flex flex-col gap-1.5 text-sm text-secondary">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-solid" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-auto flex flex-col gap-3">
        <MoneyTags amounts={article.amounts} />
        <SpinMeter neutrality={article.neutralityScore} />
      </footer>
    </article>
  );
}
