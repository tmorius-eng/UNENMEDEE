"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { formatMntShort } from "@/lib/format";
import { formatPercent } from "@/lib/officials/flags";
import type { PoliticianSummary } from "@/lib/queries";
import { cx } from "@/utils/cx";

type Sort = "assets" | "income" | "change" | "name";

const SORTS: { key: Sort; label: string }[] = [
  { key: "assets", label: "Хөрөнгө" },
  { key: "income", label: "Орлого" },
  { key: "change", label: "Өөрчлөлт" },
  { key: "name", label: "Нэр" },
];

/** Change against the newest comparable earlier year; null when the years cannot be compared. */
function change(p: PoliticianSummary): number | null {
  return p.latestAssets !== null && p.previousAssets ? p.latestAssets / p.previousAssets - 1 : null;
}

/** Filter by party and sort by the declared figures; everything links to the profile. */
export function OfficialsTable({ people }: { people: PoliticianSummary[] }) {
  const parties = useMemo(() => [...new Set(people.map((p) => p.party ?? "Бусад"))].sort(), [people]);
  const [party, setParty] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("assets");

  const rows = useMemo(() => {
    const list = people.filter((p) => party === "all" || (p.party ?? "Бусад") === party);
    const key = (p: PoliticianSummary) => (sort === "assets" ? p.latestAssets : sort === "income" ? p.latestIncome : sort === "change" ? change(p) : null) ?? -Infinity;
    return sort === "name" ? [...list].sort((a, b) => a.fullName.localeCompare(b.fullName, "mn")) : [...list].sort((a, b) => key(b) - key(a));
  }, [people, party, sort]);

  const chip = (active: boolean) =>
    cx("shrink-0 cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition", active ? "bg-brand-solid text-primary_on-brand ring-transparent" : "text-secondary ring-primary hover:bg-primary_hover");

  return (
    <div className="flex flex-col gap-4">
      <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4">
        <button type="button" className={chip(party === "all")} onClick={() => setParty("all")}>
          Бүгд ({people.length})
        </button>
        {parties.map((p) => (
          <button key={p} type="button" className={chip(party === p)} onClick={() => setParty(p)}>
            {p} ({people.filter((x) => (x.party ?? "Бусад") === p).length})
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm text-tertiary">
        Эрэмбэлэх:
        {SORTS.map((s) => (
          <button key={s.key} type="button" className={chip(sort === s.key)} onClick={() => setSort(s.key)}>
            {s.label}
          </button>
        ))}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((p) => {
          const c = change(p);
          return (
            <li key={p.id} className="min-w-0">
              <Link href={`/officials/${p.id}`} className="flex h-full min-w-0 gap-3 rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset transition hover:ring-brand">
                {/* eslint-disable-next-line @next/next/no-img-element -- portraits come from parliament.mn */}
                {p.photoUrl ? <img src={p.photoUrl} alt="" loading="lazy" className="size-14 shrink-0 rounded-full bg-secondary object-cover" /> : <span className="size-14 shrink-0 rounded-full bg-secondary" />}
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-semibold text-primary">{p.fullName}</span>
                  <span className="truncate text-xs text-tertiary">
                    {p.party ?? "—"}
                    {p.constituency ? ` · ${p.constituency}` : ""}
                  </span>
                  {p.latestYear ? (
                    <span className="text-sm text-secondary">
                      {p.latestYear}: хөрөнгө <b className="tabular-nums">{formatMntShort(p.latestAssets ?? 0)}</b>, орлого <span className="tabular-nums">{formatMntShort(p.latestIncome ?? 0)}</span>
                      {c !== null && Math.abs(c) >= 0.01 && (
                        // Neutral colour on purpose: a change is a number, not a verdict.
                        <span className="ml-1 text-xs font-semibold text-tertiary tabular-nums" title={`${p.previousYear}→${p.latestYear}`}>
                          {c > 0 ? "▲" : "▼"} {formatPercent(c)} <span className="font-normal">({p.previousYear}→{p.latestYear})</span>
                        </span>
                      )}
                      {c === null && p.comparisonLimited && <span className="ml-1 text-xs text-quaternary">харьцуулах боломжгүй</span>}
                    </span>
                  ) : (
                    <span className="text-sm text-quaternary">Мэдүүлэг олдоогүй</span>
                  )}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
