import { describe, it, expect } from "vitest";
import { calculateTax } from "../src/calculate-tax";
import { quarterFromIsoDate, sumByQuarter } from "../src/quarters";
import { computeVatProximity } from "../src/vat";
import { bgnInvoice, profile } from "./helpers";

describe("quarterFromIsoDate", () => {
  it("maps months to quarters correctly", () => {
    expect(quarterFromIsoDate("2024-01-01")).toBe(1);
    expect(quarterFromIsoDate("2024-03-31")).toBe(1);
    expect(quarterFromIsoDate("2024-04-01")).toBe(2);
    expect(quarterFromIsoDate("2024-06-30")).toBe(2);
    expect(quarterFromIsoDate("2024-07-01")).toBe(3);
    expect(quarterFromIsoDate("2024-09-30")).toBe(3);
    expect(quarterFromIsoDate("2024-10-01")).toBe(4);
    expect(quarterFromIsoDate("2024-12-31")).toBe(4);
  });

  it("rejects malformed dates", () => {
    expect(() => quarterFromIsoDate("2024/01/01")).toThrow();
    expect(() => quarterFromIsoDate("not-a-date")).toThrow();
    expect(() => quarterFromIsoDate("2024-13-01")).toThrow();
  });
});

describe("sumByQuarter", () => {
  it("buckets income into the correct quarters", () => {
    const invoices = [
      bgnInvoice("2024-02-15", 1_000),
      bgnInvoice("2024-05-20", 2_000),
      bgnInvoice("2024-08-10", 4_000),
      bgnInvoice("2024-11-30", 8_000),
    ];
    const sums = sumByQuarter(invoices, 2024);
    expect(sums[1]).toBe(1_000);
    expect(sums[2]).toBe(2_000);
    expect(sums[3]).toBe(4_000);
    expect(sums[4]).toBe(8_000);
  });
});

describe("computeVatProximity", () => {
  it("computes proximity percent and warning correctly", () => {
    const r = computeVatProximity(100_000, 2024);
    // 100,000 / 166,000 ≈ 60.2%
    expect(r.vat_proximity_percent).toBeCloseTo(60.2, 1);
    expect(r.vat_warning).toBe(false);
  });

  it("warns at exactly the threshold", () => {
    const r = computeVatProximity(166_000, 2024);
    expect(r.vat_proximity_percent).toBe(100);
    expect(r.vat_warning).toBe(true);
  });

  it("returns over-100% past the threshold", () => {
    const r = computeVatProximity(200_000, 2024);
    expect(r.vat_proximity_percent).toBeGreaterThan(100);
    expect(r.vat_warning).toBe(true);
  });
});

describe("calculateTax — corner amounts", () => {
  it("handles income below the minimum SS base (fully_self_employed)", () => {
    // 5,000 BGN income, minimum monthly base would force 11,196 BGN/year SS base
    // but the engine caps SS base at actual income.
    const r = calculateTax(
      [bgnInvoice("2024-04-15", 5_000)],
      profile({
        type: "fully_self_employed",
        birth_year: 1985,
        chosen_monthly_base: 933,
      }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.social_security.residual_base).toBe(5_000);
    expect(r.final_taxable_base).toBeGreaterThanOrEqual(0);
  });

  it("handles income at exactly the annual maximum SS base (45,000 BGN, 2024)", () => {
    const r = calculateTax(
      [bgnInvoice("2024-06-30", 45_000)],
      profile({
        type: "fully_self_employed",
        birth_year: 1985,
        chosen_monthly_base: 3_750, // exact max
      }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.social_security.residual_base).toBe(45_000);
  });

  it("handles income well above the maximum SS base", () => {
    const r = calculateTax(
      [bgnInvoice("2024-06-30", 200_000)],
      profile({
        type: "fully_self_employed",
        birth_year: 1985,
        chosen_monthly_base: 3_750,
      }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    // SS base capped at annual max regardless of income
    expect(r.social_security.residual_base).toBe(45_000);
    // VAT warning expected at this income level
    expect(r.vat_warning).toBe(true);
  });

  it("ignores invoices outside the target year", () => {
    const r = calculateTax(
      [
        bgnInvoice("2023-12-15", 100_000),
        bgnInvoice("2025-01-15", 100_000),
      ],
      profile({ type: "civil_contract_only" }),
      2024,
    );
    expect(r.status).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.gross_income).toBe(0);
  });
});
