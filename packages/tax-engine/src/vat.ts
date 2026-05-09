import { getTaxConstants } from "./constants/index";

export interface VatProximity {
  vat_warning: boolean;
  /** Percentage of the VAT registration threshold reached. e.g. 87 means 87%. */
  vat_proximity_percent: number;
}

/**
 * Computes how close the freelancer is to the VAT registration threshold
 * for the given tax year. The threshold is denominated in the year's
 * filing currency (BGN through 2025, EUR from 2026 onward).
 */
export function computeVatProximity(grossIncome: number, year: number): VatProximity {
  const c = getTaxConstants(year);
  const fraction = grossIncome / c.vat_threshold;
  const percent = Math.round(fraction * 1000) / 10;
  return {
    vat_warning: fraction >= c.vat_warning_proximity,
    vat_proximity_percent: percent,
  };
}
