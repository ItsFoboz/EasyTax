/**
 * Shape of the tax constants table for a single year.
 * One file per year populates this shape.
 */
export interface TaxConstants {
  year: number;
  normative_expense_rate: number; // e.g. 0.25 for liberal professions
  income_tax_rate: number; // e.g. 0.10
  min_monthly_base: number; // BGN
  max_monthly_base: number; // BGN
  vat_threshold_bgn: number; // annual turnover threshold for VAT registration
  health_insurance_rate: number; // e.g. 0.08
  pension_rate_pre1960: number; // birth_year < 1960
  pension_rate_post1959: number; // birth_year >= 1960 (1st pillar)
  upf_rate_post1959: number; // 2nd pillar UPF, post-1959 only
  sickness_maternity_rate: number; // e.g. 0.035
  /** Fraction of vat_threshold_bgn at which to surface a warning. e.g. 0.8 = 80%. */
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
