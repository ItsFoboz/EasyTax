/**
 * Bulgarian tax & social security constants for tax year 2024.
 * Filed in BGN. (Bulgaria adopted the euro on 2026-01-01.)
 */

import type { TaxConstants } from "./schema";

export const constants2024: TaxConstants = {
  year: 2024,
  currency: "BGN",
  normative_expense_rate: 0.25,
  income_tax_rate: 0.1,
  min_monthly_base: 933,
  max_monthly_base: 3750,
  vat_threshold: 166_000, // per spec; ЗДДС raised the threshold to 166k
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
