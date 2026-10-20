import { ArrowLeft, LinkExternal01 } from "@untitledui/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AIMessage } from "@/components/iltod/ai-message";
import { ArticleGrid } from "@/components/iltod/article-grid";
import { DeepBadge, MoneyTags, RiskBadge, SourceBadge } from "@/components/iltod/badges";
import { FactSpinPanel } from "@/components/iltod/fact-spin-panel";
import { HashBadge } from "@/components/iltod/hash-badge";
import { TimeAgo } from "@/components/iltod/time-ago";
import { formatDateMn, tldrSentences } from "@/lib/format";
import { getArticleBySlug, getCluster, getRecentSlugs } from "@/lib/queries";

/** Cache Components requires at least one param; unknown slugs render on demand (ISR). */
export async function generateStaticParams() {
  const slugs = await getRecentSlugs(20);
  return (slugs.length ? slugs : ["__placeholder__"]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/article/[slug]">): Promise<Metadata> {
  const article = await getArticleBySlug((await params).slug);
  if (!article) return { title: "Мэдээ олдсонгүй" };
  return { title: article.title, description: tldrSentences(article.tldr).join(" ").slice(0, 200) };
}

async function Related({ clusterId, currentId }: { clusterId: number; currentId: number }) {
  const data = await getCluster(clusterId);
  const others = data?.articles.filter((a) => a.id !== currentId) ?? [];
  if (!data || others.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-primary">Энэ сэдвээр бусад эх сурвалж</h2>
        <Link href={`/clusters/${clusterId}`} className="text-sm font-semibold text-brand-secondary hover:underline">
          {data.cluster.title} · {data.cluster.articleCount} мэдээ
        </Link>
      </div>
      <ArticleGrid articles={others.slice(0, 3)} />
    </section>
  );
}

async function ArticleView({ params }: { params: PageProps<"/article/[slug]">["params"] }) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) notFound();

  const paragraphs = article.cleanContent.split(/\n{2,}|\n/).filter((p) => p.trim().length > 0);
  return (
    <article className="flex flex-col gap-10">
      <header className="flex flex-col gap-5">
        <Link href="/" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-tertiary hover:text-secondary">
          <ArrowLeft className="size-4" /> Бүх мэдээ
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge domain={article.sourceDomain} category={article.sourceCategory} size="md" />
          <span className="text-sm text-tertiary">{article.sourceName}</span>
          <span className="text-sm text-quaternary">·</span>
          <TimeAgo date={article.publishedAt} className="text-sm text-tertiary" />
          <span className="flex gap-1.5 sm:ml-auto">
            {article.hasDeepAnalysis && <DeepBadge />}
            <RiskBadge score={article.riskScore} size="md" />
          </span>
        </div>
        <h1 className="text-display-xs font-semibold tracking-tight text-balance text-primary md:text-display-sm">{article.title}</h1>
        <MoneyTags amounts={article.amounts} max={6} />
      </header>

      <AIMessage tier="tier1" title="TL;DR · DeepSeek хураангуй">
        <ul className="flex flex-col gap-2 text-md text-primary">
          {tldrSentences(article.tldr).map((s) => (
            <li key={s} className="flex gap-2">
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-solid" />
              {s}
            </li>
          ))}
        </ul>
      </AIMessage>

      <FactSpinPanel facts={article.facts} spin={article.spinDetected} neutrality={article.neutralityScore} />

      {article.deepAnalysis && (
        <section className="rounded-3xl bg-linear-to-br from-purple-500/10 via-transparent to-fuchsia-500/10 p-1">
          <AIMessage tier="tier2" title="⚡ Grok Эрэн Сурвалжлах Дүгнэлт" markdown={article.deepAnalysis} />
        </section>
      )}

      {(article.entities.people.length > 0 || article.entities.orgs.length > 0) && (
        <section className="grid gap-4 md:grid-cols-2">
          {[
            { label: "Холбогдох хүмүүс", items: article.entities.people },
            { label: "Байгууллагууд", items: article.entities.orgs },
          ]
            .filter((g) => g.items.length)
            .map((g) => (
              <div key={g.label} className="rounded-2xl bg-primary p-5 ring-1 ring-secondary ring-inset">
                <h3 className="text-sm font-semibold text-tertiary">{g.label}</h3>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {g.items.map((p) => (
                    <span key={p} className="rounded-md bg-secondary px-2 py-1 text-sm text-secondary">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-3xl bg-primary p-6 ring-1 ring-secondary ring-inset md:p-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-primary">Эх текст (албан ёсны)</h2>
            <p className="text-sm text-tertiary">
              {formatDateMn(article.publishedAt)}-нд нийтлэгдсэн. Цэвэрлэсэн текстийн SHA-256 хэш: хэн ч эх хуудсыг дахин татаж шалгах боломжтой.
            </p>
          </div>
          <a
            href={article.originalUrl}
            target="_blank"
            rel="noreferrer nofollow"
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-solid_hover"
          >
            Эх сурвалж руу очих <LinkExternal01 className="size-4" />
          </a>
        </div>
        <HashBadge hash={article.contentHash} />
        <div className="prose max-w-none text-secondary dark:prose-invert">
          {paragraphs.slice(0, 60).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      {article.clusterId && (
        <Suspense fallback={null}>
          <Related clusterId={article.clusterId} currentId={article.id} />
        </Suspense>
      )}
    </article>
  );
}

export default function ArticlePage(props: PageProps<"/article/[slug]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-primary ring-1 ring-secondary ring-inset" />}>
      <ArticleView params={props.params} />
    </Suspense>
  );
}
