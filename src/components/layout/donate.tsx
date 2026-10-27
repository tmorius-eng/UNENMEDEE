import Link from "next/link";

import { CopyText } from "@/components/iltod/copy-text";
import { DEFAULT_DONATION, groupAccount } from "@/lib/donation";
import { getDonation } from "@/lib/queries";
import { cx } from "@/utils/cx";

/**
 * "Дэмжих" chip that shrinks with the screen: sm = pill, md = + account and copy,
 * lg = + bank and the full label. Below sm it is in the menu and the footer instead.
 */
export async function DonateChip({ className }: { className?: string }) {
  // In the header of every page: a database blip falls back to the default account, never an error page.
  const d = await getDonation().catch(() => DEFAULT_DONATION);
  return (
    <div className={cx("min-w-0 items-center gap-2 text-xs", className)}>
      <Link href="/support" className="shrink-0 font-semibold whitespace-nowrap text-brand-secondary hover:underline">
        💙 <span className="hidden lg:inline">Ил тод мэдээг </span>
        <span className="lg:lowercase">Дэмжих</span>
      </Link>
      <span className="label-mono hidden min-w-0 truncate text-tertiary md:inline">
        <span className="hidden lg:inline">{d.bank} · </span>
        <span className="text-secondary">{groupAccount(d.account)}</span>
      </span>
      <CopyText text={d.account} className="hidden md:inline-flex" />
    </div>
  );
}

/** Full card for the footer and /support: bank, account, holder, copy button. */
export async function DonateCard({ className }: { className?: string }) {
  // In the footer of every page: same fallback as DonateChip, a DB blip never reaches the root layout.
  const d = await getDonation().catch(() => DEFAULT_DONATION);
  return (
    <div className={cx("flex flex-col gap-2 rounded-2xl bg-primary p-4 ring-1 ring-line ring-inset", className)}>
      <p className="label-mono text-tertiary">
        {d.bank}
        {d.holder ? ` · ${d.holder}` : ""}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="num-mono text-md break-all text-primary">{groupAccount(d.account)}</span>
        <CopyText text={d.account} label="Данс хуулах" className="ring-1 ring-line ring-inset" />
      </div>
    </div>
  );
}
