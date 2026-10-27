/**
 * schema.org builders for page-level JSON-LD (rendered with `jsonLd()` from site.ts). Pure, so
 * the shapes are unit-tested. Facts only: names, links and what the page holds, never a judgement.
 */
import { absoluteUrl, SITE_NAME } from "@/lib/site";

type Crumb = { name: string; path: string };

/** Home first, then the given trail. */
export function breadcrumbLd(trail: Crumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: SITE_NAME, path: "/" }, ...trail].map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: absoluteUrl(c.path) })),
  };
}

export interface DatasetInfo {
  name: string;
  description: string;
  /** Who publishes the numbers (Монголбанк, ҮСХ...). */
  creator: { name: string; url: string };
  /** The official page the numbers come from. */
  sourceUrl: string;
  /** ISO 8601 interval, e.g. "1990/..". */
  temporalCoverage?: string;
  keywords?: string[];
}

/** A Dataset that names its official creator and source; we only re-show it. */
export function datasetLd(d: DatasetInfo, pagePath: string) {
  return {
    "@type": "Dataset",
    name: d.name,
    description: d.description,
    url: absoluteUrl(pagePath),
    sameAs: d.sourceUrl,
    isBasedOn: d.sourceUrl,
    creator: { "@type": "GovernmentOrganization", name: d.creator.name, url: d.creator.url },
    isAccessibleForFree: true,
    inLanguage: "mn",
    spatialCoverage: { "@type": "Country", name: "Монгол Улс" },
    ...(d.temporalCoverage ? { temporalCoverage: d.temporalCoverage } : {}),
    ...(d.keywords?.length ? { keywords: d.keywords } : {}),
  };
}

export interface PersonInfo {
  id: number;
  fullName: string;
  shortName: string;
  party: string | null;
  photoUrl: string | null;
  profileUrl: string;
  isActive: boolean;
  constituency: string | null;
}

/** An MP profile: who they are and where the official records live. */
export function personLd(p: PersonInfo) {
  return {
    "@type": "Person",
    "@id": `${absoluteUrl(`/officials/${p.id}`)}#person`,
    name: p.fullName,
    alternateName: p.shortName,
    jobTitle: p.isActive ? "УИХ-ын гишүүн" : "УИХ-ын гишүүн асан",
    url: absoluteUrl(`/officials/${p.id}`),
    sameAs: [p.profileUrl],
    ...(p.photoUrl ? { image: p.photoUrl } : {}),
    ...(p.party ? { affiliation: { "@type": "PoliticalParty", name: p.party } } : {}),
    memberOf: { "@type": "GovernmentOrganization", name: "Монгол Улсын Их Хурал", url: "https://www.parliament.mn" },
    ...(p.constituency ? { workLocation: { "@type": "Place", name: p.constituency } } : {}),
  };
}
