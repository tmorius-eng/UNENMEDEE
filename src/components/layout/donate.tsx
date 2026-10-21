import Link from "next/link";

import { CopyText } from "@/components/iltod/copy-text";
import { groupAccount } from "@/lib/donation";
import { getDonation } from "@/lib/queries";
import { cx } from "@/utils/cx";

/**
 * "Дэмжих" chip that shrinks with the screen: sm = pill, md = + account and copy,
 * lg = + bank and the full label. Below sm it is in the menu and the footer instead.
 */
export async function DonateChip({ className }: { className?: string }) {
  const d = await getDonation();
  return (
    <div className={cx("min-w-0 items-center gap-2 text-xs", className)}>
      <Link href="/support" className="shrink-0 font-semibold whitespace-nowrap text-brand-secondary hover:underline">
        💙 <span className="hidden lg:inline">Ил тод мэдээг </span>
        <span className="lg:lowercase">Дэмжих</span>
      </Link>
      <span className="hidden min-w-0 truncate text-tertiary md:inline">
        <span className="hidden lg:inline">{d.bank} · </span>
        <span className="font-mono text-secondary">{groupAccount(d.account)}</span>
      </span>
      <CopyText text={d.account} className="hidden md:inline-flex" />
    </div>
  );
}

/** Full card for the footer and /support: bank, account, holder, copy button. */
export async function DonateCard({ className }: { className?: string }) {
  const d = await getDonation();
  return (
    <div className={cx("flex flex-col gap-2 rounded-2xl bg-primary p-4 ring-1 ring-secondary ring-inset", className)}>
      <p className="text-xs text-tertiary">
        {d.bank}
        {d.holder ? ` · ${d.holder}` : ""}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-md font-semibold break-all text-primary">{groupAccount(d.account)}</span>
        <CopyText text={d.account} label="Данс хуулах" className="ring-1 ring-primary ring-inset" />
      </div>
    </div>
  );
}
