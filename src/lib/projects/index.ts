import { formatShare, PER_PERSON_MIN, POPULATION } from "@/lib/per-person";
import { absoluteUrl, SITE_NAME } from "@/lib/site";
import { breadcrumbLd } from "@/lib/structured-data";

import { PROJECTS } from "./data";
import { type BudgetKind, type BudgetLine, KIND_LABEL, type Project, type SourceKind, type Stage, STAGES, type When } from "./types";

export { PROJECTS, PROJECTS_VERIFIED_THROUGH } from "./data";
export * from "./types";

export const findProject = (slug: string): Project | undefined => PROJECTS.find((p) => p.slug === slug);

export const stageIndex = (s: Stage): number => STAGES.findIndex((x) => x.key === s);

export const BUDGET_KIND_LABEL: Record<BudgetKind, string> = {
  approved: "батлагдсан төсөв",
  amendment: "тодотгол",
  plan: "төсвийн төсөл",
  spent: "гүйцэтгэл",
};

/** "2018" → 2018-07-01, "2025-05" → the 1st: a partial date is placed inside its period. */
export function whenToDate(w: When): Date {
  if (/^\d{4}$/.test(w)) return new Date(`${w}-07-01T00:00:00Z`);
  if (/^\d{4}-\d{2}$/.test(w)) return new Date(`${w}-01T00:00:00Z`);
  return new Date(`${w}T00:00:00Z`);
}

const MONTH_GEN = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];

/** "2018 он", "2025 оны 5-р сар", "2025 оны 3-р сарын 26" — as precise as the source. */
export function whenLabel(w: When): string {
  const [y, m, d] = w.split("-");
  if (!m) return `${y} он`;
  const month = MONTH_GEN[Number(m) - 1] ?? m;
  return d ? `${y} оны ${month}-р сарын ${Number(d)}` : `${y} оны ${month}-р сар`;
}

/** Whole years and months between two dates (floor), never negative. */
export function yearsSince(from: When, today: Date): { years: number; months: number } {
  const a = whenToDate(from);
  let months = (today.getUTCFullYear() - a.getUTCFullYear()) * 12 + (today.getUTCMonth() - a.getUTCMonth());
  if (today.getUTCDate() < a.getUTCDate()) months -= 1;
  months = Math.max(0, months);
  return { years: Math.floor(months / 12), months: months % 12 };
}

/** "3 жил 10 сар", "7 сар", "0 сар". */
export function sinceLabel(from: When, today: Date): string {
  const { years, months } = yearsSince(from, today);
  if (years === 0) return `${months} сар`;
  return months === 0 ? `${years} жил` : `${years} жил ${months} сар`;
}

/** ₮ reported as spent (kind `spent` only): plans and approvals are not spending. */
export function officialSpent(p: Project): number {
  return p.budgets.filter((b) => b.kind === "spent").reduce((a, b) => a + b.amount, 0);
}

/** The newest year's budget lines (approved and amendments first, else the plan). */
export function latestBudget(p: Project): BudgetLine[] {
  if (p.budgets.length === 0) return [];
  const year = Math.max(...p.budgets.map((b) => b.year));
  const rows = p.budgets.filter((b) => b.year === year);
  const firm = rows.filter((b) => b.kind === "approved" || b.kind === "amendment");
  return firm.length ? firm : rows;
}

/** "≈ 14 200₮ / хүн" for a ₮ amount ≥ 1 тэрбум, null otherwise (never for USD). */
export function perPerson(amountMnt: number): string | null {
  return amountMnt >= PER_PERSON_MIN ? formatShare(amountMnt / POPULATION.count) : null;
}

const OFFICIAL_HOSTS = /(^|\.)(gov\.mn|legalinfo\.mn|parliament\.mn|mongolia\.gov\.mn|ulaanbaatar\.mn|shilendans\.gov\.mn|khural\.mn)$/;
const STATE_MEDIA_HOSTS = /(^|\.)(montsame\.mn|mnb\.mn)$/;

/** Official page, state media, or the press: shown next to every source link. */
export function sourceKind(url: string): SourceKind {
  try {
    const host = new URL(url).hostname;
    if (OFFICIAL_HOSTS.test(host)) return "official";
    if (STATE_MEDIA_HOSTS.test(host)) return "state-media";
  } catch {
    // not a URL: the press label is the safe one
  }
  return "press";
}

export const SOURCE_KIND_LABEL: Record<SourceKind, string> = {
  official: "албан",
  "state-media": "төрийн мэдээ",
  press: "хэвлэл",
};

/** Every URL a project cites, once. */
export function projectUrls(p: Project): string[] {
  const urls = [p.announced.source.url, p.planned?.source.url, p.stage.source.url, ...p.budgets.map((b) => b.source.url), ...p.events.map((e) => e.source.url), ...p.people.map((x) => x.source.url)];
  return [...new Set(urls.filter((u): u is string => typeof u === "string"))];
}

export function projectListLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Мега төслүүд: албан шийдвэр, төсөв, үе шат",
        url: absoluteUrl("/projects"),
        inLanguage: "mn",
        isPartOf: { "@type": "WebSite", name: SITE_NAME, url: absoluteUrl("/") },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: PROJECTS.map((p, i) => ({ "@type": "ListItem", position: i + 1, name: p.name, url: absoluteUrl(`/projects/${p.slug}`) })),
        },
      },
      breadcrumbLd([{ name: "Төслүүд", path: "/projects" }]),
    ],
  };
}

export function projectLd(p: Project) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: `${p.name}: албан шийдвэр, төсөв, үе шат`,
        url: absoluteUrl(`/projects/${p.slug}`),
        inLanguage: "mn",
        dateModified: p.verifiedThrough,
        about: { "@type": "Thing", name: p.name, description: p.summary, additionalType: KIND_LABEL[p.kind] },
        isBasedOn: projectUrls(p),
      },
      breadcrumbLd([
        { name: "Төслүүд", path: "/projects" },
        { name: p.name, path: `/projects/${p.slug}` },
      ]),
    ],
  };
}
