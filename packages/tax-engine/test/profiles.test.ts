import { describe, it, expect } from "vitest";
import { calculateTax } from "../src/calculate-tax.js";
import { getTaxConstants } from "../src/constants/index.js";
import { evenMonthlyInvoices, profile } from "./helpers.js";

const C2024 = getTaxConstants(2024);

describe("calculateTax — profile parity at 60,000 BGN gross income", () => {
  const invoices = evenMonthlyInvoices(2024, 60_000);

  it("civil_contract_only: zero SS, full intermediate base taxed", () => {
    const r = calculateTax(
      invoices,
      profile({ type: "civil_contract_only", birth_year: 1985 }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.social_security.total).toBe(0);
    expect(r.final_taxable_base).toBe(45_000);
    expect(r.income_tax).toBe(4_500);
  });

  it("fully_self_employed (post-1959, min base): SS computed on annual minimum", () => {
    const r = calculateTax(
      invoices,
      profile({
        type: "fully_self_employed",
        birth_year: 1985,
        chosen_monthly_base: C2024.min_monthly_base,
      }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    const annualBase = C2024.min_monthly_base * 12; // 11,196
    expect(r.social_security.residual_base).toBe(annualBase);
    expect(r.social_security.total).toBeGreaterThan(0);
    expect(r.income_tax).toBeLessThan(4_500); // less than civil_contract case because SS reduces base
  });

  it("eood_managing_director with EOOD covering 1,500 BGN/month: residual gap remains", () => {
    const r = calculateTax(
      invoices,
      profile({
        type: "eood_managing_director",
        birth_year: 1985,
        eood_monthly_insurance_base: 1_500,
      }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    const expectedGap = C2024.max_monthly_base * 12 - 1_500 * 12; // 27,000
    // freelance_income 60k > gap, so residual_base = gap
    expect(r.social_security.residual_base).toBe(expectedGap);
  });

  it("eood_managing_director with EOOD covering max: zero residual", () => {
    const r = calculateTax(
      invoices,
      profile({
        type: "eood_managing_director",
        birth_year: 1985,
        eood_monthly_insurance_base: C2024.max_monthly_base,
      }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.social_security.residual_base).toBe(0);
    expect(r.social_security.total).toBe(0);
  });

  it("employed_primary with employer reporting 30,000 BGN: residual = gap to max", () => {
    const r = calculateTax(
      invoices,
      profile({
        type: "employed_primary",
        birth_year: 1985,
        employer_annual_insurable_income: 30_000,
      }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    const gap = C2024.max_monthly_base * 12 - 30_000; // 15,000
    expect(r.social_security.residual_base).toBe(gap);
  });

  it("employed_primary with employer at max: zero residual", () => {
    const r = calculateTax(
      invoices,
      profile({
        type: "employed_primary",
        birth_year: 1985,
        employer_annual_insurable_income: C2024.max_monthly_base * 12,
      }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.social_security.total).toBe(0);
  });
});

describe("calculateTax — pension rate split by birth year", () => {
  const invoices = evenMonthlyInvoices(2024, 60_000);

  it("post-1959 splits pension into 1st pillar + UPF", () => {
    const r = calculateTax(
      invoices,
      profile({
        type: "fully_self_employed",
        birth_year: 1985,
        chosen_monthly_base: C2024.min_monthly_base,
      }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.social_security.upf).toBeGreaterThan(0);
    expect(r.social_security.pension).toBeGreaterThan(0);
  });

  it("pre-1960 pays no UPF (higher 1st pillar rate instead)", () => {
    const r = calculateTax(
      invoices,
      profile({
        type: "fully_self_employed",
        birth_year: 1955,
        chosen_monthly_base: C2024.min_monthly_base,
      }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.social_security.upf).toBe(0);
    // Higher pension rate (0.198) should produce more pension than the post-1959 case (0.148)
    expect(r.social_security.pension).toBeGreaterThan(
      C2024.min_monthly_base * 12 * C2024.pension_rate_post1959,
    );
  });
});

describe("calculateTax — health_insured_elsewhere", () => {
  const invoices = evenMonthlyInvoices(2024, 60_000);

  it("skips health contribution entirely", () => {
    const r = calculateTax(
      invoices,
      profile({
        type: "fully_self_employed",
        birth_year: 1985,
        chosen_monthly_base: C2024.min_monthly_base,
        health_insured_elsewhere: true,
      }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.social_security.health).toBe(0);
  });
});
