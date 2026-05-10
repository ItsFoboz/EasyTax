export {
  calculateCorporateTax,
  emptyExpenses,
  sumExpenses,
} from "./calculate-corporate-tax";
export {
  DIVIDEND_WITHHOLDING_RATE,
  calculateDividendWithholding,
  declaration142Deadline,
} from "./dividends";
export type { DividendCalc } from "./dividends";
export type {
  CorporateExpenseBreakdown,
  CorporateTaxResult,
  CorporateTaxResultSuccess,
  CorporateRequiresAccountant,
  CalculateCorporateTaxInput,
} from "./types";
