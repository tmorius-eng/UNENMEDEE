"use client";

import { useActionState } from "react";

import { type ActionResult, saveHiddenYears } from "@/app/admin/actions";

const input = "w-full rounded-lg bg-primary px-3 py-2 text-sm text-primary shadow-xs ring-1 ring-primary ring-inset outline-none focus:ring-2 focus:ring-brand";

/** "46:2025, 12:2023": declaration years left out of the officials comparison, with the profile saying so. */
export function HiddenYearsForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveHiddenYears, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <label className="flex flex-col gap-1 text-xs font-medium text-tertiary">
        Гишүүний id : он (таслалаар), жишээ нь 46:2025
        <input name="pairs" defaultValue={current} maxLength={2000} placeholder="46:2025, 12:2023" className={`${input} font-mono`} />
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-brand-solid px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-brand-solid_hover disabled:opacity-60">
        {pending ? "Хадгалж байна…" : "Хадгалах"}
      </button>
      {state && <p className={`text-sm sm:col-span-2 ${state.ok ? "text-success-primary" : "text-error-primary"}`}>{state.message}</p>}
    </form>
  );
}
