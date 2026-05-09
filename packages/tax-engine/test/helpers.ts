import type { Invoice, InsuranceProfile } from "../src/types";

/**
 * Convenience helper to build an invoice in the filing currency.
 * Use for both BGN years (2024-2025) and EUR years (2026+) — the engine
 * is currency-agnostic.
 */
export function localInvoice(date: string, amount: number, id?: string): Invoice {
  return {
    id,
    issue_date: date,
    amount_original: amount,
    currency: "BGN", // tests pre-2026 default; not consulted by the engine
    exchange_rate: 1,
    amount,
  };
}

/** Back-compat alias used by older tests. */
export const bgnInvoice = localInvoice;

/** Spreads `total` evenly across one invoice per month for a year. */
export function evenMonthlyInvoices(year: number, total: number): Invoice[] {
  const each = total / 12;
  return Array.from({ length: 12 }, (_, i) => {
    const month = String(i + 1).padStart(2, "0");
    return localInvoice(`${year}-${month}-15`, each, `inv-${year}-${month}`);
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

/** Approx-equal helper; tax math involves rounding so use 0.05 tolerance. */
export function approx(actual: number, expected: number, tol = 0.05): boolean {
  return Math.abs(actual - expected) <= tol;
}
