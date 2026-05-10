/**
 * Bulgarian tax & social security constants for tax year 2026.
 *
 * First EUR tax year. Bulgaria adopted the euro on 2026-01-01 at the
 * official fixed parity 1 EUR = 1.95583 BGN. Because the 2026 Budget Act
 * was not adopted in time, the main thresholds, contribution bases, taxes
 * and benefits were "frozen" at their 2025 BGN levels and automatically
 * converted to EUR at parity (rounded to 2 decimals per the official
 * methodology — wages/pensions round at the third decimal place UP).
 *
 * Source: published amendments effective 2026-01-01.
 *
 * Conversion provenance:
 *   min_monthly_base:  1077 BGN / 1.95583 = 550.66 EUR
 *   max_monthly_base:  4130 BGN / 1.95583 = 2111.64 EUR
 *   vat_threshold:     100,000 BGN / 1.95583 ≈ 51,130 EUR (officially published as 51,130)
 *
 * All rates (income tax 10%, pension 14.8% / 19.8%, UPF 5%, health 8%,
 * sickness/maternity 3.5%) are unchanged — euro adoption is a unit
 * conversion, not a tax reform.
 *
 * Note: the 2026 statutory minimum wage is 620.20 EUR/month (BGN 1,213) —
 * higher than the minimum insurable income of 550.66 EUR. For certain
 * occupational groups whose insurable income is below the minimum wage,
 * social security contributions are calculated on the minimum wage. v1
 * doesn't model occupational groups; freelancers and self-insured persons
 * pay on min_monthly_base as before.
 */

import type { TaxConstants } from "./schema";

export const constants2026: TaxConstants = {
  year: 2026,
  currency: "EUR",
  normative_expense_rate: 0.25,
  income_tax_rate: 0.1,
  min_monthly_base: 550.66,
  max_monthly_base: 2_111.64,
  vat_threshold: 51_130, // EUR; officially published — 100,000 BGN at parity
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
