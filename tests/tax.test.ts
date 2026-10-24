import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { estimatePayrollTax, looksLikeSalary, payrollFromInputs, payrollParts, sharesFromSpending, taxReceipt } from "@/lib/tax/receipt";

describe("Миний татвар", () => {
  it("estimates НДШ 11.5% plus ХХОАТ 10% after НДШ", () => {
    // 1,000,000: НДШ 115,000; ХХОАТ (1,000,000 - 115,000) * 10% = 88,500
    assert.equal(estimatePayrollTax(1_000_000), 203_500);
    assert.equal(estimatePayrollTax(0), 0);
    assert.equal(estimatePayrollTax(Number.NaN), 0);
  });

  it("adds the VAT inside purchases (price / 11) and splits the total by budget shares", () => {
    const r = taxReceipt({ payrollMonthly: 100_000, purchasesMonthly: 1_100_000 }, [
      { name: "Цалин", share: 0.75 },
      { name: "Хөрөнгө оруулалт", share: 0.25 },
    ]);
    assert.equal(r.payrollYear, 1_200_000);
    assert.equal(r.vatYear, 1_200_000);
    assert.equal(r.total, 2_400_000);
    assert.deepEqual(
      r.lines.map((l) => [l.name, l.amount]),
      [
        ["Цалин", 1_800_000],
        ["Хөрөнгө оруулалт", 600_000],
      ],
    );
  });

  it("ignores negative or empty input", () => {
    assert.equal(taxReceipt({ payrollMonthly: -5, purchasesMonthly: Number.NaN }, [{ name: "A", share: 1 }]).total, 0);
  });

  it("builds shares from one year of the NSO split", () => {
    const s = sharesFromSpending(
      [
        { name: "A", values: { "2025": 30, "2024": 1 } },
        { name: "B", values: { "2025": 10 } },
        { name: "C", values: { "2025": null } },
      ],
      "2025",
    );
    assert.deepEqual(s, [
      { name: "A", share: 0.75 },
      { name: "B", share: 0.25 },
    ]);
  });

  it("estimates a 3 000 000 ₮ salary and 1 000 000 ₮ of shopping", () => {
    assert.deepEqual(payrollParts(3_000_000), { si: 345_000, pit: 265_500, total: 610_500 });
    const payroll = payrollFromInputs({ salary: 3_000_000, exact: 0 });
    assert.deepEqual(payroll, { monthly: 610_500, source: "estimate" });
    const r = taxReceipt({ payrollMonthly: payroll.monthly, purchasesMonthly: 1_000_000 }, [{ name: "A", share: 1 }]);
    assert.equal(r.payrollYear, 7_326_000);
    assert.equal(r.vatYear, 1_090_909);
    assert.equal(r.total, 8_416_909);
  });

  it("prefers the payslip amount and spots a salary typed as tax", () => {
    assert.deepEqual(payrollFromInputs({ salary: 3_000_000, exact: 590_000 }), { monthly: 590_000, source: "exact" });
    assert.deepEqual(payrollFromInputs({ salary: 0, exact: 0 }), { monthly: 0, source: "none" });
    assert.equal(looksLikeSalary(3_000_000, 3_000_000), true);
    assert.equal(looksLikeSalary(3_000_000, 0), true);
    assert.equal(looksLikeSalary(590_000, 3_000_000), false);
    assert.equal(looksLikeSalary(150_000, 0), false);
  });
});
