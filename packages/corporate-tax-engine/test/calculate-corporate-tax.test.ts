import { describe, it, expect } from "vitest";
import {
  calculateCorporateTax,
  emptyExpenses,
} from "../src/calculate-corporate-tax";

const Y = 2026;

describe("calculateCorporateTax — basic flow", () => {
  it("zero revenue + zero expenses → zero tax", () => {
    const r = calculateCorporateTax({
      total_revenue: 0,
      expenses: emptyExpenses(),
      year: Y,
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.corporate_income_tax).toBe(0);
    expect(r.representative_expense_tax).toBe(0);
    expect(r.total_tax_liability).toBe(0);
    expect(r.tax_base).toBe(0);
  });

  it("pure profit (no expenses) is taxed at 10%", () => {
    const r = calculateCorporateTax({
      total_revenue: 100_000,
      expenses: emptyExpenses(),
      year: Y,
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.tax_base).toBe(100_000);
    expect(r.corporate_income_tax).toBe(10_000);
    expect(r.total_tax_liability).toBe(10_000);
    expect(r.effective_rate_on_revenue).toBe(10);
  });

  it("loss case → tax 0, accounting_profit negative", () => {
    const r = calculateCorporateTax({
      total_revenue: 50_000,
      expenses: { ...emptyExpenses(), operating: 80_000 },
      year: Y,
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.accounting_profit).toBeLessThan(0);
    expect(r.corporate_income_tax).toBe(0);
    expect(r.total_tax_liability).toBe(0);
  });

  it("simple case: revenue 200k, expenses 100k → tax base 100k → tax 10k", () => {
    const r = calculateCorporateTax({
      total_revenue: 200_000,
      expenses: {
        ...emptyExpenses(),
        wages: 50_000,
        operating: 30_000,
        other_deductible: 20_000,
      },
      year: Y,
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.tax_base).toBe(100_000);
    expect(r.corporate_income_tax).toBe(10_000);
  });
});

describe("calculateCorporateTax — donation cap (10% of accounting profit)", () => {
  it("donations within cap are fully deductible", () => {
    const r = calculateCorporateTax({
      total_revenue: 100_000,
      expenses: {
        ...emptyExpenses(),
        operating: 50_000,
        donations: 4_000, // 10% of (100k - 54k) = 4.6k cap; 4k under
      },
      year: Y,
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.donations_deductible).toBe(4_000);
    expect(r.donations_excess_added_back).toBe(0);
  });

  it("donations above cap are partly added back to tax base", () => {
    const r = calculateCorporateTax({
      total_revenue: 100_000,
      expenses: {
        ...emptyExpenses(),
        operating: 40_000,
        donations: 10_000,
      },
      year: Y,
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    // accounting_profit = 100k − 50k = 50k; cap = 5k; excess = 5k
    expect(r.accounting_profit).toBe(50_000);
    expect(r.donation_cap).toBe(5_000);
    expect(r.donations_deductible).toBe(5_000);
    expect(r.donations_excess_added_back).toBe(5_000);
    // deductible = 40k operating + 5k donations = 45k
    // tax_base = 100k − 45k = 55k → tax = 5,500
    expect(r.tax_base).toBe(55_000);
    expect(r.corporate_income_tax).toBe(5_500);
  });

  it("zero donation cap when accounting profit is non-positive", () => {
    const r = calculateCorporateTax({
      total_revenue: 50_000,
      expenses: {
        ...emptyExpenses(),
        operating: 60_000,
        donations: 1_000,
      },
      year: Y,
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.donation_cap).toBe(0);
    expect(r.donations_deductible).toBe(0);
    expect(r.donations_excess_added_back).toBe(1_000);
  });
});

describe("calculateCorporateTax — Art. 204 expense tax", () => {
  it("10% expense tax on representative expenses, separate from income tax", () => {
    const r = calculateCorporateTax({
      total_revenue: 100_000,
      expenses: {
        ...emptyExpenses(),
        operating: 30_000,
        representative: 5_000,
      },
      year: Y,
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.representative_expense_tax).toBe(500);
    // tax_base = 100k - (30k + 5k) = 65k → 6,500
    expect(r.corporate_income_tax).toBe(6_500);
    expect(r.total_tax_liability).toBe(7_000);
  });
});

describe("calculateCorporateTax — non-deductibles", () => {
  it("non-deductible expenses reduce accounting profit but not tax base", () => {
    const r = calculateCorporateTax({
      total_revenue: 100_000,
      expenses: {
        ...emptyExpenses(),
        operating: 40_000,
        non_deductible: 10_000, // e.g. fines
      },
      year: Y,
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.accounting_profit).toBe(50_000); // 100k - 50k
    expect(r.deductible_expenses).toBe(40_000); // non-ded excluded
    expect(r.tax_base).toBe(60_000); // 100k - 40k
    expect(r.corporate_income_tax).toBe(6_000);
  });
});

describe("calculateCorporateTax — currency awareness", () => {
  it("returns BGN for 2025 tax years", () => {
    const r = calculateCorporateTax({
      total_revenue: 50_000,
      expenses: emptyExpenses(),
      year: 2025,
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.currency).toBe("BGN");
  });

  it("returns EUR for 2026 tax years", () => {
    const r = calculateCorporateTax({
      total_revenue: 50_000,
      expenses: emptyExpenses(),
      year: 2026,
    });
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.currency).toBe("EUR");
  });
});

describe("calculateCorporateTax — input validation", () => {
  it("rejects negative revenue", () => {
    const r = calculateCorporateTax({
      total_revenue: -1,
      expenses: emptyExpenses(),
      year: Y,
    });
    expect(r.status).toBe("requires_accountant");
  });

  it("throws for unconfigured year", () => {
    expect(() =>
      calculateCorporateTax({
        total_revenue: 0,
        expenses: emptyExpenses(),
        year: 1999,
      }),
    ).toThrow();
  });
});
