/** Formats a BGN amount with Bulgarian locale separators. */
export function formatBgn(amount: number): string {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "BGN",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Formats a percentage with one decimal place. */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}
