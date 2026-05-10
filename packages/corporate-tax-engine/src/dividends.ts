/**
 * Dividend withholding (5% data при източника) under Bulgarian ЗДДФЛ.
 *
 * Companies that distribute dividends to individual recipients withhold
 * a flat 5% from the gross amount. The tax is reported via Декларация
 * по чл. 142 ЗДДФЛ — quarterly, due by the end of the month following
 * the quarter in which the distribution was made.
 *
 * Note: there are exemptions / reduced rates for some EU/EEA recipients
 * under double-tax treaties. v1 ignores these — flag for accountant.
 */

export const DIVIDEND_WITHHOLDING_RATE = 0.05;

export interface DividendCalc {
  gross: number;
  withholding: number;
  net: number;
  rate: number;
}

export function calculateDividendWithholding(grossAmount: number): DividendCalc {
  if (!Number.isFinite(grossAmount) || grossAmount < 0) {
    return { gross: 0, withholding: 0, net: 0, rate: DIVIDEND_WITHHOLDING_RATE };
  }
  const withholding = round2(grossAmount * DIVIDEND_WITHHOLDING_RATE);
  return {
    gross: round2(grossAmount),
    withholding,
    net: round2(grossAmount - withholding),
    rate: DIVIDEND_WITHHOLDING_RATE,
  };
}

/**
 * Returns the deadline for filing Декларация по чл. 142 (and paying the
 * withheld 5%) for a distribution made on `distributionDate`. Rule: end
 * of the month FOLLOWING the quarter in which the distribution falls.
 */
export function declaration142Deadline(distributionDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(distributionDate);
  if (!m) throw new Error(`Invalid ISO date: ${distributionDate}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  // Q1 (Jan-Mar) → April 30; Q2 (Apr-Jun) → July 31;
  // Q3 (Jul-Sep) → October 31; Q4 (Oct-Dec) → January 31 of NEXT year.
  if (month <= 3) return `${year}-04-30`;
  if (month <= 6) return `${year}-07-31`;
  if (month <= 9) return `${year}-10-31`;
  return `${year + 1}-01-31`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
