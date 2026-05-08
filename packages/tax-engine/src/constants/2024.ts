/**
 * Bulgarian tax & social security constants for tax year 2024.
 *
 * Sources:
 *  - ЗДДФЛ (Закон за данъците върху доходите на физическите лица) — 25% normative
 *    expense deduction for liberal professions (Art. 29(1)(3)).
 *  - КСО (Кодекс за социално осигуряване) — pension/health/sickness rates.
 *  - 2024 Budget Act — minimum and maximum monthly insurable bases.
 *  - ЗДДС — VAT registration threshold raised to 166,000 BGN.
 *
 * NOTE: rates and thresholds may be amended by the Budget Act each January.
 * Update this single file. All downstream logic reads from here.
 */

import type { TaxConstants } from "./schema";

export const constants2024: TaxConstants = {
  year: 2024,
  normative_expense_rate: 0.25,
  income_tax_rate: 0.1,
  min_monthly_base: 933, // BGN
  max_monthly_base: 3750, // BGN
  vat_threshold_bgn: 166_000, // per spec; ЗДДС raised this from 100,000
  health_insurance_rate: 0.08,
  pension_rate_pre1960: 0.198,
  pension_rate_post1959: 0.148,
  upf_rate_post1959: 0.05,
  sickness_maternity_rate: 0.035,
  vat_warning_proximity: 0.8, // emit warning at 80% of threshold
  deadlines: {
    annual_declaration: "April 30",
    quarterly_q1: "April 15",
    quarterly_q2: "July 15",
    quarterly_q3: "October 15",
    form1_monthly: "25th of following month",
    form6_annual: "April 30",
  },
};
