import type { Invoice, QuarterlyBreakdown } from "./types";

export type QuarterIndex = 1 | 2 | 3 | 4;

/**
 * Returns the calendar quarter (1-4) that an ISO date belongs to.
 * Throws on malformed dates.
 */
export function quarterFromIsoDate(iso: string): QuarterIndex {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) {
    throw new Error(`Invalid ISO date for invoice: ${iso}`);
  }
  const month = Number(m[2]);
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month in date: ${iso}`);
  }
  if (month <= 3) return 1;
  if (month <= 6) return 2;
  if (month <= 9) return 3;
  return 4;
}

/**
 * Sums invoice amounts (in the filing currency) by calendar quarter.
 * Filters by year if provided.
 */
export function sumByQuarter(
  invoices: Invoice[],
  year?: number,
): Record<QuarterIndex, number> {
  const sums: Record<QuarterIndex, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const inv of invoices) {
    if (year !== undefined && !inv.issue_date.startsWith(`${year}-`)) continue;
    const q = quarterFromIsoDate(inv.issue_date);
    sums[q] += inv.amount;
  }
  return sums;
}

/**
 * Computes the four quarterly figures the user pays.
 *
 * Q1, Q2, Q3 are advance payments due on the 15th of the month following
 * the quarter end. Each advance is 10% of:
 *
 *   quarterly_gross
 *     - 25% normative expense (proportional to that quarter)
 *     - SS contributions for that quarter (proportional to gross share)
 *
 * Q4 is the final reconciliation booked in the annual declaration.
 */
export function computeQuarterly(args: {
  invoices: Invoice[];
  year: number;
  totalGross: number;
  totalSocialSecurity: number;
  totalIncomeTax: number;
  normativeRate: number;
  taxRate: number;
}): QuarterlyBreakdown {
  const { invoices, year, totalGross, totalSocialSecurity, totalIncomeTax, normativeRate, taxRate } = args;
  const sums = sumByQuarter(invoices, year);

  const computeAdvance = (q: QuarterIndex): number => {
    const qGross = sums[q];
    if (qGross <= 0) return 0;
    const share = totalGross > 0 ? qGross / totalGross : 0;
    const qSocial = totalSocialSecurity * share;
    const qBase = qGross * (1 - normativeRate) - qSocial;
    if (qBase <= 0) return 0;
    return round2(qBase * taxRate);
  };

  const q1 = computeAdvance(1);
  const q2 = computeAdvance(2);
  const q3 = computeAdvance(3);
  const q4_reconciliation = round2(totalIncomeTax - (q1 + q2 + q3));

  return { q1, q2, q3, q4_reconciliation };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
