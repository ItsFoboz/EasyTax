import { getTaxConstants } from "./constants/index.js";

export interface VatProximity {
  vat_warning: boolean;
  /** Percentage of the VAT registration threshold reached. e.g. 87 means 87%. */
  vat_proximity_percent: number;
}

/**
 * Computes how close the freelancer is to the VAT registration threshold.
 * The warning fires at vat_warning_proximity (default 80%) and any value
 * above 100 means they are already legally obliged to register.
 */
export function computeVatProximity(grossIncome: number, year: number): VatProximity {
  const c = getTaxConstants(year);
  const fraction = grossIncome / c.vat_threshold_bgn;
  const percent = Math.round(fraction * 1000) / 10; // 1 decimal place
  return {
    vat_warning: fraction >= c.vat_warning_proximity,
    vat_proximity_percent: percent,
  };
}
