/**
 * Shape of the tax constants table for a single year.
 * One file per year populates this shape.
 */
export interface TaxConstants {
  year: number;
  /**
   * The official filing currency for this tax year.
   * Bulgaria filed in BGN through 2025 and switched to EUR on 2026-01-01
   * at the fixed parity 1 EUR = 1.95583 BGN.
   */
  currency: "BGN" | "EUR";
  normative_expense_rate: number; // e.g. 0.25 for liberal professions
  income_tax_rate: number; // e.g. 0.10
  min_monthly_base: number; // expressed in `currency`
  max_monthly_base: number; // expressed in `currency`
  vat_threshold: number; // annual turnover threshold for VAT registration, in `currency`
  health_insurance_rate: number; // e.g. 0.08
  pension_rate_pre1960: number; // birth_year < 1960
  pension_rate_post1959: number; // birth_year >= 1960 (1st pillar)
  upf_rate_post1959: number; // 2nd pillar UPF, post-1959 only
  sickness_maternity_rate: number; // e.g. 0.035
  /** Fraction of vat_threshold at which to surface a warning. e.g. 0.8 = 80%. */
  vat_warning_proximity: number;
  deadlines: {
    annual_declaration: string;
    quarterly_q1: string;
    quarterly_q2: string;
    quarterly_q3: string;
    form1_monthly: string;
    form6_annual: string;
  };
}

/** Fixed BGN/EUR parity. Set on 1999-07-05, locked in for the EUR adoption. */
export const BGN_EUR_FIXED_RATE = 1.95583;
