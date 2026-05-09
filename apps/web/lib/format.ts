import { getTaxConstants } from "@easytax/tax-engine";

/**
 * Formats a monetary amount in the filing currency for the given tax year.
 * Bulgaria filed in BGN through 2025 and switched to EUR on 2026-01-01.
 */
export function formatMoney(amount: number, year: number): string {
  const c = getTaxConstants(year);
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: c.currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Returns the bare currency symbol/code for a given tax year, useful for
 * inline labels (e.g. slider tick marks) where Intl currency formatting
 * is too verbose.
 */
export function currencyLabel(year: number): string {
  const c = getTaxConstants(year);
  return c.currency === "EUR" ? "€" : "лв.";
}

/** Formats a percentage with one decimal place. */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Formats a number using Bulgarian locale separators (no currency).
 * Useful for labels like "минимум 551 €/мес." where we want the symbol
 * positioned manually.
 */
export function formatNumber(amount: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("bg-BG", { maximumFractionDigits: 2, ...options }).format(amount);
}
