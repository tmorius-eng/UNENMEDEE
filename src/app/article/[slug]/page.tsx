import { ArrowLeft, LinkExternal01 } from "@untitledui/icons";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AIMarkdownMessage } from "@/components/iltod/ai-markdown";
import { AIMessage } from "@/components/iltod/ai-message";
import { ArticleGrid } from "@/components/iltod/article-grid";
import { DeepBadge, MoneyTags, RiskBadge, SourceBadge } from "@/components/iltod/badges";
import { FactSpinPanel } from "@/components/iltod/fact-spin-panel";
import { HashBadge } from "@/components/iltod/hash-badge";
import { ShareButton } from "@/components/iltod/share-button";
import { TimeAgo } from "@/components/iltod/time-ago";
import { aiModelLabel } from "@/lib/ai/model-label";
import { formatDateMn, tldrSentences } from "@/lib/format";
import { type ArticleDetail, getArticleBySlug, getCluster, getRecentSlugs } from "@/lib/queries";
import { absoluteUrl, jsonLd, SITE_NAME, SITE_URL } from "@/lib/site";
import { topicFor } from "@/lib/topics";

/** Cache Components requires at least one param; unknown slugs render on demand (ISR). */
export async function generateStaticParams() {
  const slugs = await getRecentSlugs(20);
  return (slugs.length ? slugs : ["__placeholder__"]).map((slug) => ({ slug }));
}

function summaryOf(article: ArticleDetail): string {
  const text = tldrSentences(article.tldr).join(" ").replace(/\s+/g, " ").trim();
  if (text.length <= 160) return text;
  const cut = text.slice(0, 157);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 100 ? cut.lastIndexOf(" ") : 157).replace(/[\s.,;:–—-]+$/, "")}…`;
}

export async function generateMetadata({ params }: PageProps<"/article/[slug]">): Promise<Metadata> {
  const article = await getArticleBySlug((await params).slug);
  if (!article) return { title: "Мэдээ олдсонгүй", robots: { index: false } };
  const topic = topicFor(article.sourceDomain, article.sourceCategory, article.topic);
  const description = summaryOf(article);
  const url = `/article/${article.slug}`;
  return {
    title: article.title,
    description,
    keywords: [topic.label, article.sourceName, ...article.entities.orgs.slice(0, 5), ...article.entities.people.slice(0, 3), "мэдээ"],
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: article.title,
      description,
      siteName: SITE_NAME,
      locale: "mn_MN",
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: (article.editedAt ?? article.createdAt).toISOString(),
      section: topic.label,
      tags: article.entities.orgs.slice(0, 5),
    },
    twitter: { card: "summary_large_image", title: article.title, description },
  };
}

/** Google "Top stories" / News: NewsArticle + breadcrumbs. */
function articleJsonLd(article: ArticleDetail) {
  const url = absoluteUrl(`/article/${article.slug}`);
  const topic = topicFor(article.sourceDomain, article.sourceCategory, article.topic);
  const published = (article.publishedAt ?? article.createdAt).toISOString();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsArticle",
        "@id": `${url}#article`,
        mainEntityOfPage: url,
        url,
        headline: article.title.length > 110 ? `${article.title.slice(0, 109)}…` : article.title,
        description: summaryOf(article),
        image: [absoluteUrl(`/article/${article.slug}/opengraph-image`)],
        datePublished: published,
        dateModified: (article.editedAt ?? article.createdAt).toISOString(),
        inLanguage: "mn",
        articleSection: topic.label,
        keywords: [topic.label, ...article.entities.orgs.slice(0, 5)].join(", "),
        isBasedOn: article.originalUrl,
        sourceOrganization: { "@type": "GovernmentOrganization", name: article.sourceName, url: `https://${article.sourceDomain}` },
        author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
        publisher: { "@id": `${SITE_URL}/#org` },
        isAccessibleForFree: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Мэдээ", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: topic.label, item: absoluteUrl(topic.key === "other" ? "/" : `/topic/${topic.key}`) },
          { "@type": "ListItem", position: 3, name: article.title, item: url },
        ],
      },
    ],
  };
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

  const dateUnknown = article.scrapeMeta?.date_unknown === true;
  const paragraphs = article.cleanContent.split(/\n{2,}|\n/).filter((p) => p.trim().length > 0);
  return (
    <article className="flex flex-col gap-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(articleJsonLd(article)) }} />
      <header className="flex flex-col gap-5">
        <Link href="/" className="flex w-fit items-center gap-1.5 text-sm font-semibold text-tertiary hover:text-secondary">
          <ArrowLeft className="size-4" /> Бүх мэдээ
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge domain={article.sourceDomain} category={article.sourceCategory} size="md" />
          <span className="text-sm text-tertiary">{article.sourceName}</span>
          <span className="text-sm text-quaternary">·</span>
          {dateUnknown ? (
            <span className="text-sm text-tertiary" title={`Эх хуудсанд огноо байхгүй. ${formatDateMn(article.createdAt)}-нд цуглуулсан.`}>
              Огноо тодорхойгүй
            </span>
          ) : (
            <TimeAgo date={article.publishedAt} className="text-sm text-tertiary" />
          )}
          <span className="flex gap-1.5 sm:ml-auto">
            {article.hasDeepAnalysis && <DeepBadge />}
            <RiskBadge score={article.riskScore} size="md" />
            <Link href="/method#risk" className="self-center text-xs font-medium text-tertiary underline decoration-dotted hover:text-secondary">
              AI-ийн үнэлгээ
            </Link>
          </span>
        </div>
        <h1 className="text-display-xs font-semibold tracking-tight text-balance text-primary md:text-display-sm">{article.title}</h1>
        <MoneyTags amounts={article.amounts} max={6} />
        <ShareButton path={`/article/${slug}`} title={article.title} text={tldrSentences(article.tldr, 1)[0]} className="w-fit" />
      </header>

      <AIMessage
        tier="tier1"
        title={
          article.summaryFallback
            ? "Хураангуй · эх текстийн эхний өгүүлбэрүүд (AI ажиллаагүй)"
            : article.tier1Model
            ? `AI хураангуй · ${aiModelLabel(article.tier1Model)}`
            : article.sourceDomain === "opendata.gov.mn"
              ? "Хураангуй · дүрмээр гаргасан (AI ашиглаагүй)"
              : "AI хураангуй"
        }
      >
        <ul className="flex flex-col gap-2 text-md text-primary">
          {tldrSentences(article.tldr).map((s) => (
            <li key={s} className="flex gap-2">
              <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-solid" />
              {s}
            </li>
          ))}
        </ul>
      </AIMessage>

      {!article.summaryFallback && <FactSpinPanel facts={article.facts} spin={article.spinDetected} neutrality={article.neutralityScore} />}

      {article.deepAnalysis && (
        <section className="rounded-3xl bg-linear-to-br from-purple-500/10 via-transparent to-fuchsia-500/10 p-1">
          <AIMarkdownMessage tier="tier2" title={`⚡ Гүнзгий шинжилгээ${article.tier2Model ? ` · ${aiModelLabel(article.tier2Model)}` : ""}`} markdown={article.deepAnalysis} />
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
              {dateUnknown ? `Эх хуудсанд нийтэлсэн огноо байхгүй; ${formatDateMn(article.createdAt)}-нд цуглуулсан.` : `${formatDateMn(article.publishedAt)}-нд нийтлэгдсэн.`} Цэвэрлэсэн текстийн SHA-256 хэш: хэн ч эх хуудсыг дахин татаж шалгах боломжтой.
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
        {article.contentPrunedAt && (
          <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-secondary">
            Хадгалах зай хэмнэхийн тулд 6 сараас дээш хугацааны мэдээний эх текстийн зөвхөн эхний хэсгийг хадгалдаг. Бүтэн текстийг эх сурвалжаас уншина уу; SHA-256 хэш анхны бүтэн текстийнх.
          </p>
        )}
        {article.editedAt && (
          <p className="rounded-lg bg-warning-primary px-3 py-2 text-sm text-warning-primary">
            ✏️ Редакцийн засвартай ({formatDateMn(article.editedAt)}). Доорх текстийг редактор зассан; SHA-256 хэш нь анх татсан эх текстэд хамаарна.
          </p>
        )}
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
