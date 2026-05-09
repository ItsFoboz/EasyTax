/**
 * Public types for corporate tax (ЗКПО) calculations.
 *
 * Scope: Bulgarian corporate income tax under чл. 92 ЗКПО for small/medium
 * companies. Common adjustments per Annex 1 (donation cap, representative
 * expense tax, non-deductibles); does NOT cover the full ~20 adjustments
 * (related-party transfer pricing, thin capitalization, etc.) — those need
 * an accountant.
 *
 * All monetary values are in the filing currency of the tax year (BGN
 * through 2025, EUR from 2026 onward at fixed parity 1.95583).
 */

export interface CorporateExpenseBreakdown {
  /** Wages + employer social security contributions. Fully deductible. */
  wages: number;
  /** Rent, utilities, materials, external services, etc. Fully deductible. */
  operating: number;
  /** Depreciation per the tax depreciation schedule (CTAD). Fully deductible. */
  depreciation: number;
  /**
   * Representative expenses / business meals (представителни разходи).
   * Deductible for income tax, but subject to an additional 10% expense tax
   * under Art. 204 ЗКПО.
   */
  representative: number;
  /**
   * Donations (дарения по чл. 31 ЗКПО). Deductible up to 10% of positive
   * accounting profit; the excess is added back to the tax base.
   */
  donations: number;
  /** Any other fully deductible expense not captured above. */
  other_deductible: number;
  /**
   * Expenses that are not deductible: fines, expenses without primary
   * documents, expenses for personal use of company assets without
   * compensation, etc. Always added back to the tax base.
   */
  non_deductible: number;
}

export interface CorporateTaxResultSuccess {
  status: "ok";
  year: number;
  currency: "BGN" | "EUR";

  // Inputs echoed back, normalised
  total_revenue: number;
  total_expenses: number;

  // Accounting view
  accounting_profit: number;

  // Adjustments
  donation_cap: number;
  donations_deductible: number;
  donations_excess_added_back: number;

  // Tax view
  deductible_expenses: number;
  non_deductible_expenses_total: number;
  tax_base: number;

  // Tax due
  corporate_income_tax: number; // 10% of tax_base (clamped at 0)
  representative_expense_tax: number; // 10% of representative expenses (Art. 204)
  total_tax_liability: number;

  // Diagnostics
  effective_rate_on_revenue: number; // total_tax_liability / total_revenue * 100
  notes: string[];
}

export interface CorporateRequiresAccountant {
  status: "requires_accountant";
  reason: string;
}

export type CorporateTaxResult = CorporateTaxResultSuccess | CorporateRequiresAccountant;

export interface CalculateCorporateTaxInput {
  total_revenue: number;
  expenses: CorporateExpenseBreakdown;
  year: number;
}
