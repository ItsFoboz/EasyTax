import type { Invoice, InsuranceProfile } from "../src/types.js";

export function bgnInvoice(date: string, amount: number, id?: string): Invoice {
  return {
    id,
    issue_date: date,
    amount_original: amount,
    currency: "BGN",
    exchange_rate: 1,
    amount_bgn: amount,
  };
}

/** Spreads `total` evenly across one invoice per month for a year. */
export function evenMonthlyInvoices(year: number, total: number): Invoice[] {
  const each = total / 12;
  return Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    return bgnInvoice(`${year}-${month}-15`, each, `inv-${year}-${month}`);
  });
}

export function profile(overrides: Partial<InsuranceProfile> = {}): InsuranceProfile {
  return {
    type: "fully_self_employed",
    birth_year: 1985,
    health_insured_elsewhere: false,
    ...overrides,
  };
}

/** Approx-equal helper; tax math involves rounding so use 0.05 BGN tolerance. */
export function approx(actual: number, expected: number, tol = 0.05): boolean {
  return Math.abs(actual - expected) <= tol;
}
