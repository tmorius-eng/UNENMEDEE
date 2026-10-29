"use client";

import { useActionState } from "react";

import { type ActionResult, saveAbout } from "@/app/admin/actions";
import { ABOUT_FIELDS, type About } from "@/lib/about";

const textarea = "w-full rounded-lg bg-primary px-3 py-2 text-sm leading-relaxed text-primary shadow-xs ring-1 ring-primary ring-inset outline-none focus:ring-2 focus:ring-brand";

/** The five paragraphs of /about. Plain text: an empty line starts a new paragraph. */
export function AboutForm({ current }: { current: About }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(saveAbout, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      {ABOUT_FIELDS.map((f) => (
        <label key={f.key} className="flex flex-col gap-1 text-xs font-medium text-tertiary">
          <span>
            {f.label} <span className="font-normal text-quaternary">· {f.hint}</span>
          </span>
          <textarea name={f.key} defaultValue={current[f.key]} maxLength={f.max} rows={f.key === "lead" ? 3 : 4} className={textarea} />
        </label>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="rounded-lg bg-brand-solid px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-brand-solid_hover disabled:opacity-60">
          {pending ? "Хадгалж байна…" : "«Бид хэн бэ» хадгалах"}
        </button>
        <a href="/about" target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-secondary hover:underline">
          /about нээх ↗
        </a>
        {state && <p className={`text-sm ${state.ok ? "text-success-primary" : "text-error-primary"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
