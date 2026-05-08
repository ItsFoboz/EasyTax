/**
 * Bulgarian tax & social security constants for tax year 2025.
 *
 * TODO: VERIFY all 2025 figures against the published 2025 Budget Act and
 * 2025 КСО amendments before relying on these in production. The figures
 * below reflect the best public information available at scaffold time and
 * are placed here so the engine can be exercised end-to-end. The single
 * source of truth pattern means a one-line change in this file propagates
 * everywhere.
 *
 * Known changes vs 2024:
 *  - Minimum monthly insurable base for self-insured persons raised in line
 *    with the 2025 minimum wage adjustment.
 *  - Maximum monthly insurable base raised.
 *  - VAT threshold remains 166,000 BGN.
 *  - All rates (income tax, pension, health, sickness, UPF) unchanged.
 */

import type { TaxConstants } from "./schema.js";

export const constants2025: TaxConstants = {
  year: 2025,
  normative_expense_rate: 0.25,
  income_tax_rate: 0.1,
  min_monthly_base: 1_077, // TODO: verify
  max_monthly_base: 4_130, // TODO: verify
  vat_threshold_bgn: 166_000,
  health_insurance_rate: 0.08,
  pension_rate_pre1960: 0.198,
  pension_rate_post1959: 0.148,
  upf_rate_post1959: 0.05,
  sickness_maternity_rate: 0.035,
  vat_warning_proximity: 0.8,
  deadlines: {
    annual_declaration: "April 30",
    quarterly_q1: "April 15",
    quarterly_q2: "July 15",
    quarterly_q3: "October 15",
    form1_monthly: "25th of following month",
    form6_annual: "April 30",
  },
};
