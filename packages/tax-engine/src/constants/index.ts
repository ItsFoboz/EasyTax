import { constants2024 } from "./2024";
import { constants2025 } from "./2025";
import type { TaxConstants } from "./schema";

const TABLE: Record<number, TaxConstants> = {
  2024: constants2024,
  2025: constants2025,
};

/**
 * Returns the constants table for the requested tax year.
 * Throws if the year is not supported, so callers fail loudly rather than
 * silently using stale rates from a different year.
 */
export function getTaxConstants(year: number): TaxConstants {
  const c = TABLE[year];
  if (!c) {
    const supported = Object.keys(TABLE).join(", ");
    throw new Error(
      `Tax constants for year ${year} are not configured. Supported years: ${supported}. ` +
        `Add a new file at packages/tax-engine/src/constants/${year}.ts and register it in constants/index.ts.`,
    );
  }
  return c;
}

export function listSupportedYears(): number[] {
  return Object.keys(TABLE)
    .map(Number)
    .sort((a, b) => a - b);
}

export type { TaxConstants } from "./schema";
