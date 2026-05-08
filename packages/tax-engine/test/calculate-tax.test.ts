import { describe, it, expect } from "vitest";
import { calculateTax } from "../src/calculate-tax";
import { getTaxConstants } from "../src/constants/index";
import { bgnInvoice, evenMonthlyInvoices, profile } from "./helpers";

describe("calculateTax — basic flow (2024)", () => {
  const year = 2024;

  it("zero income returns zeros across the board, status ok", () => {
    const r = calculateTax([], profile({ type: "civil_contract_only" }), year);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.gross_income).toBe(0);
    expect(r.normative_expenses).toBe(0);
    expect(r.intermediate_tax_base).toBe(0);
    expect(r.income_tax).toBe(0);
    expect(r.final_taxable_base).toBe(0);
    expect(r.effective_rate).toBe(0);
    expect(r.vat_warning).toBe(false);
    expect(r.quarterly.q1).toBe(0);
    expect(r.quarterly.q2).toBe(0);
    expect(r.quarterly.q3).toBe(0);
    expect(r.quarterly.q4_reconciliation).toBe(0);
  });

  it("applies 25% normative deduction and 10% income tax", () => {
    // 60,000 BGN spread evenly. civil_contract_only → zero residual SS.
    const invoices = evenMonthlyInvoices(year, 60_000);
    const r = calculateTax(invoices, profile({ type: "civil_contract_only" }), year);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.gross_income).toBe(60_000);
    expect(r.normative_expenses).toBe(15_000); // 25%
    expect(r.intermediate_tax_base).toBe(45_000);
    expect(r.social_security.total).toBe(0);
    expect(r.final_taxable_base).toBe(45_000);
    expect(r.income_tax).toBe(4_500); // 10%
    expect(r.effective_rate).toBe(7.5);
  });

  it("only counts invoices issued in the target year", () => {
    const invoices = [
      bgnInvoice("2023-12-31", 100_000), // prior year
      bgnInvoice("2024-06-15", 10_000),
      bgnInvoice("2025-01-02", 50_000), // future year
    ];
    const r = calculateTax(invoices, profile({ type: "civil_contract_only" }), 2024);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.gross_income).toBe(10_000);
  });

  it("final_taxable_base never goes negative", () => {
    // Tiny income but full self-employment SS forces SS > intermediate base.
    const invoices = [bgnInvoice("2024-03-15", 1_000)];
    const r = calculateTax(
      invoices,
      profile({ type: "fully_self_employed", chosen_monthly_base: 933 }),
      year,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.final_taxable_base).toBeGreaterThanOrEqual(0);
    expect(r.income_tax).toBeGreaterThanOrEqual(0);
  });

  it("VAT warning fires at >=80% of threshold", () => {
    const c = getTaxConstants(year);
    const eighty = c.vat_threshold_bgn * 0.8;
    const r = calculateTax(
      [bgnInvoice("2024-06-01", eighty)],
      profile({ type: "civil_contract_only" }),
      year,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.vat_warning).toBe(true);
    expect(r.vat_proximity_percent).toBeGreaterThanOrEqual(80);
  });

  it("VAT warning does not fire at 79% of threshold", () => {
    const c = getTaxConstants(year);
    const seventyNine = c.vat_threshold_bgn * 0.79;
    const r = calculateTax(
      [bgnInvoice("2024-06-01", seventyNine)],
      profile({ type: "civil_contract_only" }),
      year,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.vat_warning).toBe(false);
  });

  it("quarterly Q1+Q2+Q3+Q4 sums equal total income tax", () => {
    const invoices = evenMonthlyInvoices(year, 60_000);
    const r = calculateTax(invoices, profile({ type: "civil_contract_only" }), year);
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    const sum =
      r.quarterly.q1 + r.quarterly.q2 + r.quarterly.q3 + r.quarterly.q4_reconciliation;
    expect(Math.abs(sum - r.income_tax)).toBeLessThanOrEqual(0.05);
  });
});

describe("calculateTax — mid-year profile change", () => {
  it("returns requires_accountant when profile_valid_from is set", () => {
    const invoices = evenMonthlyInvoices(2024, 30_000);
    const r = calculateTax(
      invoices,
      profile({
        type: "fully_self_employed",
        profile_valid_from: "2024-07-01",
        previous_profile: {
          type: "employed_primary",
          birth_year: 1985,
          health_insured_elsewhere: true,
          employer_annual_insurable_income: 30_000,
        },
      }),
      2024,
    );
    expect(r.status).toBe("requires_accountant");
    if (r.status !== "requires_accountant") return;
    expect(r.reason.toLowerCase()).toContain("accountant");
  });
});

describe("calculateTax — unsupported year", () => {
  it("throws for an unconfigured year", () => {
    expect(() =>
      calculateTax([], profile({ type: "civil_contract_only" }), 1999),
    ).toThrow(/not configured/i);
  });
});

describe("calculateTax — 2025 constants are wired", () => {
  it("uses 2025 thresholds without throwing", () => {
    const r = calculateTax(
      [bgnInvoice("2025-04-15", 50_000)],
      profile({ type: "civil_contract_only" }),
      2025,
    );
    expect(r.status).toBe("ok");
  });
});
