"use client";

import { useActionState } from "react";

import { type ActionResult, saveDonation } from "@/app/admin/actions";
import type { Donation } from "@/lib/donation";

const input = "w-full rounded-lg bg-primary px-3 py-2 text-sm text-primary shadow-xs ring-1 ring-primary ring-inset outline-none focus:ring-2 focus:ring-brand";

export function DonationForm({ current }: { current: Donation }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveDonation, null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_2fr_1fr_auto] sm:items-end">
      <label className="flex flex-col gap-1 text-xs font-medium text-tertiary">
        Банк
        <input name="bank" defaultValue={current.bank} required maxLength={60} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-tertiary">
        Дансны дугаар (IBAN эсвэл данс)
        <input name="account" defaultValue={current.account} required maxLength={30} className={`${input} font-mono`} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-tertiary">
        Хүлээн авагч (заавал биш)
        <input name="holder" defaultValue={current.holder} maxLength={80} className={input} />
      </label>
      <button type="submit" disabled={pending} className="rounded-lg bg-brand-solid px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-brand-solid_hover disabled:opacity-60">
        {pending ? "Хадгалж байна…" : "Данс хадгалах"}
      </button>
      {state && <p className={`text-sm sm:col-span-4 ${state.ok ? "text-success-primary" : "text-error-primary"}`}>{state.message}</p>}
    </form>
  );
}
