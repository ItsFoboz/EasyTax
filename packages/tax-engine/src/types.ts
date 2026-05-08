/**
 * Public type definitions for the tax-engine package.
 *
 * All monetary values are in Bulgarian Lev (BGN). Invoices arriving in foreign
 * currencies are expected to have been converted to BGN at the BNB official
 * rate for the invoice date BEFORE being passed into calculateTax().
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
  // If profile_valid_from is set, the engine refuses to calculate and flags
  // the case for a qualified accountant.
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
  /** BNB official rate used to convert to BGN. 1.0 if currency === "BGN". */
  exchange_rate: number;
  /** Amount in BGN at the BNB rate locked at extraction time. The engine uses this only. */
  amount_bgn: number;
}

export interface SocialSecurityBreakdown {
  pension: number;
  health: number;
  sickness_maternity: number;
  upf: number; // 2nd pillar, post-1959 only.
  total: number;
  /** Human-readable explanation of why this amount is owed (or not). */
  coverage_note: string;
  /** Annual base on which the contributions above were assessed. */
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
  freelance_income: number; // gross BGN income from invoices for the year
  profile: InsuranceProfile;
  year: number;
}
