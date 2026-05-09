import { getTaxConstants } from "@easytax/tax-engine";
import type {
  CalculateCorporateTaxInput,
  CorporateExpenseBreakdown,
  CorporateTaxResult,
} from "./types";

/**
 * Bulgarian corporate income tax (ЗКПО) — annual calculation for a single
 * company. Pure function. No I/O. No mutation of inputs.
 *
 * Steps:
 *   1. accounting_profit = revenue − sum(all expenses including non-deductibles)
 *   2. Apply donation cap (10% of positive accounting profit). Excess donations
 *      flow into "non-deductible additions".
 *   3. tax_base = revenue − deductible expenses
 *   4. corporate_income_tax = max(0, tax_base) × 10%
 *   5. Art. 204 expense tax: representative expenses × 10%
 *   6. total = corporate_income_tax + representative_expense_tax
 */
export function calculateCorporateTax(
  input: CalculateCorporateTaxInput,
): CorporateTaxResult {
  const { total_revenue, expenses, year } = input;
  const c = getTaxConstants(year);

  if (!Number.isFinite(total_revenue) || total_revenue < 0) {
    return {
      status: "requires_accountant",
      reason: "Negative or non-finite revenue. Please review the input.",
    };
  }

  const total_expenses = round2(sumExpenses(expenses));
  const accounting_profit = round2(total_revenue - total_expenses);

  // Donation cap: 10% of positive accounting profit
  const donation_cap = round2(Math.max(0, accounting_profit) * 0.1);
  const donations_deductible = round2(Math.min(expenses.donations, donation_cap));
  const donations_excess_added_back = round2(
    Math.max(0, expenses.donations - donations_deductible),
  );

  const deductible_expenses = round2(
    expenses.wages +
      expenses.operating +
      expenses.depreciation +
      expenses.representative +
      donations_deductible +
      expenses.other_deductible,
  );
  const non_deductible_expenses_total = round2(
    expenses.non_deductible + donations_excess_added_back,
  );

  const tax_base = round2(total_revenue - deductible_expenses);

  const corporate_income_tax = round2(Math.max(0, tax_base) * c.income_tax_rate);
  const representative_expense_tax = round2(expenses.representative * 0.1);
  const total_tax_liability = round2(corporate_income_tax + representative_expense_tax);

  const effective_rate_on_revenue =
    total_revenue > 0
      ? round2((total_tax_liability / total_revenue) * 100)
      : 0;

  const notes: string[] = [];
  if (tax_base <= 0) {
    notes.push("Данъчната основа е 0 или отрицателна — корпоративният данък е 0.");
  }
  if (donations_excess_added_back > 0) {
    notes.push(
      `Дарения над 10% от счетоводната печалба (${fmt(donations_excess_added_back)} ${c.currency}) са добавени към данъчната основа.`,
    );
  }
  if (representative_expense_tax > 0) {
    notes.push(
      `Данък върху представителните разходи (чл. 204 ЗКПО, 10%): ${fmt(representative_expense_tax)} ${c.currency}.`,
    );
  }
  if (expenses.non_deductible > 0) {
    notes.push(
      `Непризнати разходи (${fmt(expenses.non_deductible)} ${c.currency}) не намаляват данъчната основа.`,
    );
  }

  return {
    status: "ok",
    year,
    currency: c.currency,
    total_revenue: round2(total_revenue),
    total_expenses,
    accounting_profit,
    donation_cap,
    donations_deductible,
    donations_excess_added_back,
    deductible_expenses,
    non_deductible_expenses_total,
    tax_base,
    corporate_income_tax,
    representative_expense_tax,
    total_tax_liability,
    effective_rate_on_revenue,
    notes,
  };
}

export function sumExpenses(e: CorporateExpenseBreakdown): number {
  return (
    e.wages +
    e.operating +
    e.depreciation +
    e.representative +
    e.donations +
    e.other_deductible +
    e.non_deductible
  );
}

export function emptyExpenses(): CorporateExpenseBreakdown {
  return {
    wages: 0,
    operating: 0,
    depreciation: 0,
    representative: 0,
    donations: 0,
    other_deductible: 0,
    non_deductible: 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(n: number): string {
  return n.toLocaleString("bg-BG", { maximumFractionDigits: 2 });
}
