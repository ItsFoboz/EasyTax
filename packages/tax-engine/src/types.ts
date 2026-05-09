/**
 * Public type definitions for the tax-engine package.
 *
 * All monetary values inside the engine are in the *filing currency* of the
 * given tax year — BGN for 2024-2025, EUR from 2026 onward (Bulgaria adopted
 * the euro on 2026-01-01 at the fixed parity 1 EUR = 1.95583 BGN).
 *
 * Foreign-currency invoices are expected to have been converted to the
 * filing currency at the BNB official rate for the invoice date BEFORE
 * being passed to calculateTax().
 */

export type InsuranceProfileType =
  | "fully_self_employed" // Pays full SS, no other coverage.
  | "eood_managing_director" // EOOD pays their SS. Only residual gap applies.
  | "employed_primary" // Employer covers SS. Only gap to annual ceiling applies.
  | "civil_contract_only"; // SS withheld at source by payer. Zero additional SS.

export interface InsuranceProfile {
  type: InsuranceProfileType;
  birth_year: number;
  health_insured_elsewhere: boolean;

  // Profile: eood_managing_director
  eood_monthly_insurance_base?: number;

  // Profile: employed_primary
  employer_annual_insurable_income?: number;

  // Profile: fully_self_employed
  // If undefined, the engine defaults to the legal minimum monthly base for the year.
  chosen_monthly_base?: number;

  // Mid-year profile change support.
  profile_valid_from?: string; // ISO date.
  previous_profile?: Omit<InsuranceProfile, "previous_profile">;
}

export interface Invoice {
  id?: string;
  /** ISO date YYYY-MM-DD. Determines which calendar quarter the income lands in. */
  issue_date: string;
  /** Amount on the invoice in its original currency. */
  amount_original: number;
  currency: string; // "BGN" | "EUR" | "USD" | "GBP" | ...
  /** BNB official rate used to convert to the filing currency. 1.0 if currency matches filing currency. */
  exchange_rate: number;
  /**
   * Amount in the filing currency of the tax year, locked at extraction time.
   * For 2024-2025 this is BGN; for 2026+ this is EUR.
   * Whoever assembles the Invoice list is responsible for picking the right
   * column from the database (`amount_bgn` or `amount_eur`) for the year.
   */
  amount: number;
}

export interface SocialSecurityBreakdown {
  pension: number;
  health: number;
  sickness_maternity: number;
  upf: number;
  total: number;
  coverage_note: string;
  residual_base: number;
}

export interface QuarterlyBreakdown {
  q1: number;
  q2: number;
  q3: number;
  q4_reconciliation: number;
}

export interface TaxResultSuccess {
  status: "ok";
  year: number;
  /** Filing currency for this tax year. */
  currency: "BGN" | "EUR";
  gross_income: number;
  normative_expenses: number;
  intermediate_tax_base: number;
  social_security: SocialSecurityBreakdown;
  final_taxable_base: number;
  income_tax: number;
  quarterly: QuarterlyBreakdown;
  vat_warning: boolean;
  /** Percentage of the VAT registration threshold reached. e.g. 87 means 87%. */
  vat_proximity_percent: number;
  /** income_tax / gross_income, expressed as percentage points (e.g. 7.3). */
  effective_rate: number;
}

export interface RequiresAccountant {
  status: "requires_accountant";
  reason: string;
}

export type TaxResult = TaxResultSuccess | RequiresAccountant;

export interface SocialSecurityInput {
  freelance_income: number; // gross income (filing currency) for the year
  profile: InsuranceProfile;
  year: number;
}
