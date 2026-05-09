/**
 * Bulgarian tax & social security constants for tax year 2026.
 *
 * First EUR tax year. Bulgaria adopted the euro on 2026-01-01 at the fixed
 * parity 1 EUR = 1.95583 BGN.
 *
 * ⚠️ TODO: VERIFY all 2026 figures against the published 2026 Budget Act and
 * 2026 КСО amendments before relying on these in production.
 *
 * Per scaffold instruction (option 2), figures below are derived by direct
 * conversion of 2025 BGN values at the fixed parity, with conservative
 * rounding (min rounded UP, max rounded DOWN) to stay safely inside the
 * legal range until the official 2026 Budget Act figures are wired in.
 *
 *   min_monthly_base:  1077 BGN / 1.95583 = 550.66 EUR → rounded up to 551
 *   max_monthly_base:  4130 BGN / 1.95583 = 2111.66 EUR → rounded down to 2111
 *   vat_threshold:     166000 BGN / 1.95583 = 84874.00 EUR (exact)
 *
 * All rates (income tax 10%, pension 14.8% / 19.8%, UPF 5%, health 8%,
 * sickness/maternity 3.5%) are unchanged — euro adoption is a unit conversion,
 * not a tax reform.
 */

import type { TaxConstants } from "./schema";

export const constants2026: TaxConstants = {
  year: 2026,
  currency: "EUR",
  normative_expense_rate: 0.25,
  income_tax_rate: 0.1,
  min_monthly_base: 551, // TODO: verify against 2026 Budget Act
  max_monthly_base: 2_111, // TODO: verify against 2026 Budget Act
  vat_threshold: 84_874, // TODO: verify (exact conversion of 166,000 BGN)
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
