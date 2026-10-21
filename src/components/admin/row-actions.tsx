"use client";

import { useActionState } from "react";

import { reanalyze, togglePublish, type ActionResult } from "@/app/admin/actions";
import { cx } from "@/utils/cx";

const btn = "rounded-md px-2.5 py-1.5 text-xs font-semibold ring-1 ring-primary ring-inset transition hover:bg-primary_hover disabled:opacity-50";

export function PublishToggle({ id, published }: { id: number; published: boolean }) {
  return (
    <form action={togglePublish}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={cx(btn, published ? "text-success-primary" : "text-tertiary")} aria-label={published ? "Нийтлэлийг нуух" : "Нийтлэх"}>
        {published ? "● Нийтэлсэн" : "○ Нуусан"}
      </button>
    </form>
  );
}

export function ReanalyzeButtons({ id }: { id: number }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(reanalyze, null);
  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action} className="flex gap-1">
        <input type="hidden" name="id" value={id} />
        <button type="submit" name="deep" value="0" disabled={pending} className={cx(btn, "text-secondary")}>
          {pending ? "…" : "AI дахин"}
        </button>
        <button type="submit" name="deep" value="1" disabled={pending} className={cx(btn, "text-purple-600 dark:text-purple-400")}>
          {pending ? "…" : "⚡ Гүнзгий"}
        </button>
      </form>
      {state && <p className={cx("max-w-56 text-right text-xs", state.ok ? "text-success-primary" : "text-error-primary")}>{state.message}</p>}
    </div>
  );
}
