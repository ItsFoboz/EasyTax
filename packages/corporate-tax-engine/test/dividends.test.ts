import { describe, it, expect } from "vitest";
import {
  DIVIDEND_WITHHOLDING_RATE,
  calculateDividendWithholding,
  declaration142Deadline,
} from "../src/dividends";

describe("dividend withholding", () => {
  it("rate is 5%", () => {
    expect(DIVIDEND_WITHHOLDING_RATE).toBe(0.05);
  });

  it("calculates a clean 100,000 distribution", () => {
    const r = calculateDividendWithholding(100_000);
    expect(r.gross).toBe(100_000);
    expect(r.withholding).toBe(5_000);
    expect(r.net).toBe(95_000);
  });

  it("handles fractional amounts with 2-decimal rounding", () => {
    const r = calculateDividendWithholding(1234.56);
    expect(r.withholding).toBeCloseTo(61.73, 2);
    expect(r.net).toBeCloseTo(1172.83, 2);
  });

  it("zero amount → zero everywhere", () => {
    const r = calculateDividendWithholding(0);
    expect(r.gross).toBe(0);
    expect(r.withholding).toBe(0);
    expect(r.net).toBe(0);
  });

  it("negative or non-finite amounts return zeros", () => {
    expect(calculateDividendWithholding(-1).withholding).toBe(0);
    expect(calculateDividendWithholding(Number.NaN).withholding).toBe(0);
    expect(calculateDividendWithholding(Number.POSITIVE_INFINITY).withholding).toBe(0);
  });
});

describe("declaration142Deadline", () => {
  it("Q1 (Jan-Mar) → April 30 same year", () => {
    expect(declaration142Deadline("2026-01-15")).toBe("2026-04-30");
    expect(declaration142Deadline("2026-03-31")).toBe("2026-04-30");
  });

  it("Q2 (Apr-Jun) → July 31 same year", () => {
    expect(declaration142Deadline("2026-04-01")).toBe("2026-07-31");
    expect(declaration142Deadline("2026-06-30")).toBe("2026-07-31");
  });

  it("Q3 (Jul-Sep) → October 31 same year", () => {
    expect(declaration142Deadline("2026-09-15")).toBe("2026-10-31");
  });

  it("Q4 (Oct-Dec) → January 31 next year", () => {
    expect(declaration142Deadline("2026-10-01")).toBe("2027-01-31");
    expect(declaration142Deadline("2026-12-31")).toBe("2027-01-31");
  });

  it("rejects malformed dates", () => {
    expect(() => declaration142Deadline("not-a-date")).toThrow();
    expect(() => declaration142Deadline("2026/01/01")).toThrow();
  });
});
