"use client";

import { useActionState } from "react";

import { saveLedger, type ActionResult } from "@/app/admin/actions";

const input = "w-full rounded-lg bg-primary px-3 py-2 text-sm text-primary shadow-xs ring-1 ring-primary ring-inset outline-none focus:ring-2 focus:ring-brand";

export function LedgerForm({ month, defaults }: { month: string; defaults: { infra: number; ads: number | null; donations: number | null; notes: string } }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveLedger, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="flex flex-col gap-1 text-xs font-medium text-tertiary">
        Сар
        <input name="month" defaultValue={month} pattern="\d{4}-\d{2}" required className={input} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-tertiary">
        Сервер ($)
        <input name="infraCostUsd" type="number" step="0.01" min="0" defaultValue={defaults.infra} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-tertiary">
        Зарын орлого ($)
        <input name="adRevenueUsd" type="number" step="0.01" min="0" defaultValue={defaults.ads ?? ""} placeholder="бүртгээгүй" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-tertiary">
        Хандив ($)
        <input name="donationsUsd" type="number" step="0.01" min="0" defaultValue={defaults.donations ?? ""} placeholder="бүртгээгүй" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-tertiary">
        Тайлбар
        <input name="notes" defaultValue={defaults.notes} maxLength={500} className={input} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5">
        <button type="submit" disabled={pending} className="rounded-lg bg-brand-solid px-4 py-2 text-sm font-semibold text-white hover:bg-brand-solid_hover disabled:opacity-60">
          {pending ? "Хадгалж байна…" : "Хадгалах"}
        </button>
        {state && <p className={state.ok ? "text-sm text-success-primary" : "text-sm text-error-primary"}>{state.message}</p>}
        <p className="ml-auto text-xs text-tertiary">AI зардлыг ai_usage_logs-оос автоматаар тооцно. Хоосон орлого = «бүртгээгүй».</p>
      </div>
    </form>
  );
}
