/**
 * Bulgarian tax & social security constants for tax year 2025.
 * Last BGN tax year. (Bulgaria adopted the euro on 2026-01-01.)
 *
 * TODO: VERIFY all 2025 figures against the published 2025 Budget Act.
 */

import type { TaxConstants } from "./schema";

export const constants2025: TaxConstants = {
  year: 2025,
  currency: "BGN",
  normative_expense_rate: 0.25,
  income_tax_rate: 0.1,
  min_monthly_base: 1_077, // TODO: verify
  max_monthly_base: 4_130, // TODO: verify
  vat_threshold: 166_000,
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
