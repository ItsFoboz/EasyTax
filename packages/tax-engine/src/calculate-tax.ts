import { getTaxConstants } from "./constants/index.js";
import { calculateResidualSocialSecurity } from "./social-security.js";
import { computeQuarterly } from "./quarters.js";
import { computeVatProximity } from "./vat.js";
import type {
  InsuranceProfile,
  Invoice,
  TaxResult,
} from "./types.js";

/**
 * Top-level tax calculation for a Bulgarian freelancer.
 *
 * Pure function. No I/O. No DB. No network. No mutation of inputs.
 *
 * Steps:
 *   1. If a mid-year profile change is flagged on the profile, refuse to
 *      compute and return { status: "requires_accountant" }.
 *   2. Sum gross income from invoices for the year (already in BGN).
 *   3. Apply 25% normative expense deduction → intermediate tax base.
 *   4. Compute residual social security via {@link calculateResidualSocialSecurity}.
 *   5. Subtract SS from the intermediate base → final taxable base
 *      (clamped at zero — you don't get a credit for negative bases).
 *   6. Apply 10% income tax.
 *   7. Split into quarterly advances (Q1-Q3) plus Q4 reconciliation.
 *   8. Compute VAT proximity warning if gross >= 80% of threshold.
 */
export function calculateTax(
  invoices: Invoice[],
  profile: InsuranceProfile,
  year: number,
): TaxResult {
  if (profile.profile_valid_from) {
    return {
      status: "requires_accountant",
      reason:
        "Mid-year profile change detected. Please consult a qualified accountant for accurate calculation.",
    };
  }

  const c = getTaxConstants(year);

  // Sum gross income, restricted to invoices issued in the requested year.
  const gross_income = round2(
    invoices
      .filter((inv) => inv.issue_date.startsWith(`${year}-`))
      .reduce((acc, inv) => acc + (Number.isFinite(inv.amount_bgn) ? inv.amount_bgn : 0), 0),
  );

  const normative_expenses = round2(gross_income * c.normative_expense_rate);
  const intermediate_tax_base = round2(gross_income - normative_expenses);

  const social_security = calculateResidualSocialSecurity({
    freelance_income: gross_income,
    profile,
    year,
  });

  const final_taxable_base = round2(
    Math.max(0, intermediate_tax_base - social_security.total),
  );
  const income_tax = round2(final_taxable_base * c.income_tax_rate);

  const quarterly = computeQuarterly({
    invoices: invoices.filter((inv) => inv.issue_date.startsWith(`${year}-`)),
    year,
    totalGross: gross_income,
    totalSocialSecurity: social_security.total,
    totalIncomeTax: income_tax,
    normativeRate: c.normative_expense_rate,
    taxRate: c.income_tax_rate,
  });

  const { vat_warning, vat_proximity_percent } = computeVatProximity(
    gross_income,
    year,
  );

  const effective_rate =
    gross_income > 0
      ? round2((income_tax / gross_income) * 100)
      : 0;

  return {
    status: "ok",
    year,
    gross_income,
    normative_expenses,
    intermediate_tax_base,
    social_security,
    final_taxable_base,
    income_tax,
    quarterly,
    vat_warning,
    vat_proximity_percent,
    effective_rate,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
