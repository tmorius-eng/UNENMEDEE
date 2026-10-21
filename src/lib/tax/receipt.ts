/**
 * "Миний татвар": a reader's yearly taxes spread over the state budget's spending structure.
 * Taxes are pooled, not earmarked, so this is "your share if it were split like the budget".
 * Pure functions (unit-tested); the page passes the latest NSO economic split as `shares`.
 */

/** Employee social insurance (НДШ), share of gross pay. Source: PwC Worldwide Tax Summaries. */
export const SI_RATE = 0.115;
/** Personal income tax (ХХОАТ) base rate, applied after НДШ. Reliefs and 2026 changes are not modelled. */
export const PIT_RATE = 0.1;
/** Shop prices include 10% VAT, so the VAT inside a price is price / 11. */
export const VAT_SHARE_OF_PRICE = 1 / 11;

export interface BudgetShare {
  name: string;
  /** 0..1, sums to ~1 */
  share: number;
}

/** Rough monthly ХХОАТ + НДШ for a gross salary (shown to the reader as an estimate). */
export function estimatePayrollTax(grossMonthly: number): number {
  if (!Number.isFinite(grossMonthly) || grossMonthly <= 0) return 0;
  const si = grossMonthly * SI_RATE;
  return Math.round(si + (grossMonthly - si) * PIT_RATE);
}

export interface TaxReceipt {
  payrollYear: number;
  vatYear: number;
  total: number;
  lines: { name: string; amount: number; share: number }[];
}

export function taxReceipt(input: { payrollMonthly: number; purchasesMonthly: number }, shares: BudgetShare[]): TaxReceipt {
  const clean = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
  const payrollYear = Math.round(clean(input.payrollMonthly) * 12);
  const vatYear = Math.round(clean(input.purchasesMonthly) * VAT_SHARE_OF_PRICE * 12);
  const total = payrollYear + vatYear;
  const sum = shares.reduce((a, s) => a + s.share, 0) || 1;
  const lines = shares
    .map((s) => ({ name: s.name, share: s.share / sum, amount: Math.round((total * s.share) / sum) }))
    .sort((a, b) => b.amount - a.amount);
  return { payrollYear, vatYear, total, lines };
}

/** Spending shares for one year from the NSO economic split (category values in any unit). */
export function sharesFromSpending(categories: { name: string; values: Record<string, number | null> }[], year: string): BudgetShare[] {
  const rows = categories.map((c) => ({ name: c.name, value: c.values[year] ?? 0 })).filter((c) => c.value > 0);
  const total = rows.reduce((a, r) => a + r.value, 0);
  return total ? rows.map((r) => ({ name: r.name, share: r.value / total })) : [];
}
