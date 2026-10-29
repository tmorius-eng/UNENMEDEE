/** The stage ladder: five fixed steps a project is read into from an official statement. */
export type Stage = "announced" | "study" | "design" | "construction" | "operating";

export const STAGES: { key: Stage; label: string; short: string }[] = [
  { key: "announced", label: "Зарласан", short: "Зарласан" },
  { key: "study", label: "Судалгаа, ТЭЗҮ", short: "ТЭЗҮ" },
  { key: "design", label: "Зураг төсөл, санхүүжилт", short: "Зураг" },
  { key: "construction", label: "Барилга", short: "Барилга" },
  { key: "operating", label: "Ашиглалтад орсон", short: "Ашиглалт" },
];

export type ProjectKind = "city" | "energy" | "industry" | "transport" | "space";

export const KIND_LABEL: Record<ProjectKind, string> = {
  city: "Хот",
  energy: "Эрчим хүч",
  industry: "Үйлдвэр",
  transport: "Зам, тээвэр",
  space: "Сансар",
};

/** Who published the page a fact links to. */
export type SourceKind = "official" | "state-media" | "press";

export interface Source {
  name: string;
  url: string;
}

export type Currency = "MNT" | "USD";

/** A date as precise as the source gives it: "2018", "2024-06" or "2025-03-26". */
export type When = string;

export interface Money {
  amount: number;
  currency: Currency;
  /** "урьдчилсан ТЭЗҮ", "гэрээний үнэ" … */
  note?: string;
  asOf: When;
  source: Source;
}

export type BudgetKind = "approved" | "amendment" | "plan" | "spent";

export interface BudgetLine {
  year: number;
  /** ₮ */
  amount: number;
  kind: BudgetKind;
  /** "ажлын алба", "2016–2023 оны гүйцэтгэл" … */
  note?: string;
  source: Source;
}

export interface ProjectEvent {
  date: When;
  text: string;
  source: Source;
}

/** A person in an official role only (governor, council chair), never an opinion about them. */
export interface Person {
  role: string;
  name: string;
  from: When;
  source: Source;
}

export interface Project {
  slug: string;
  name: string;
  kind: ProjectKind;
  /** One neutral sentence: what the project is, by its own documents. */
  summary: string;
  /** The first official act this page has a source for. */
  announced: { date: When; act: string; source: Source };
  /** The headline cost estimate, with the document it comes from. */
  planned: Money | null;
  budgets: BudgetLine[];
  events: ProjectEvent[];
  people: Person[];
  stage: {
    level: Stage;
    /** The official statement the level is read from, quoted or paraphrased, never our judgement. */
    basis: string;
    asOf: When;
    source: Source;
  };
  links: {
    official?: string;
    /** Шилэн данс organisation id (shilendans.gov.mn/organization/<id>). */
    shilendansOrgId?: string;
    /** Index into PROGRAMME.megaProjects (the 2024–2028 programme's 14 mega projects). */
    megaIndex?: number;
    /** The /search phrases that find this project's news. */
    search: string[];
  };
  /** The day a person last re-read every source of this entry. */
  verifiedThrough: string;
}
