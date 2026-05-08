import { describe, it, expect } from "vitest";
import { calculateResidualSocialSecurity } from "../src/social-security";
import { getTaxConstants } from "../src/constants/index";
import { profile } from "./helpers";

const YEAR = 2024;
const C = getTaxConstants(YEAR);
const ANNUAL_MIN = C.min_monthly_base * 12; // 11,196
const ANNUAL_MAX = C.max_monthly_base * 12; // 45,000

describe("social-security — fully_self_employed", () => {
  it("uses the legal minimum base when chosen_monthly_base is omitted", () => {
    const ss = calculateResidualSocialSecurity({
      freelance_income: 100_000,
      profile: profile({ type: "fully_self_employed", birth_year: 1985 }),
      year: YEAR,
    });
    expect(ss.residual_base).toBe(ANNUAL_MIN);
    expect(ss.coverage_note).toMatch(/self-employment/i);
  });

  it("clamps a chosen base below the legal minimum", () => {
    const ss = calculateResidualSocialSecurity({
      freelance_income: 100_000,
      profile: profile({
        type: "fully_self_employed",
        birth_year: 1985,
        chosen_monthly_base: 100, // illegal, below minimum
      }),
      year: YEAR,
    });
    expect(ss.residual_base).toBe(ANNUAL_MIN);
    expect(ss.coverage_note).toMatch(/raised from .* to the legal minimum/i);
  });

  it("clamps a chosen base above the legal maximum", () => {
    const ss = calculateResidualSocialSecurity({
      freelance_income: 200_000,
      profile: profile({
        type: "fully_self_employed",
        birth_year: 1985,
        chosen_monthly_base: 10_000, // way above maximum
      }),
      year: YEAR,
    });
    expect(ss.residual_base).toBe(ANNUAL_MAX);
    expect(ss.coverage_note).toMatch(/capped at the legal maximum/i);
  });

  it("caps base at actual freelance income when income < chosen annual base", () => {
    const ss = calculateResidualSocialSecurity({
      freelance_income: 5_000, // below ANNUAL_MIN
      profile: profile({
        type: "fully_self_employed",
        birth_year: 1985,
        chosen_monthly_base: C.min_monthly_base,
      }),
      year: YEAR,
    });
    expect(ss.residual_base).toBe(5_000);
    expect(ss.coverage_note).toMatch(/capped at your actual annual freelance income/i);
  });

  it("applies post-1959 pension split (1st pillar + UPF)", () => {
    const ss = calculateResidualSocialSecurity({
      freelance_income: 100_000,
      profile: profile({
        type: "fully_self_employed",
        birth_year: 1985,
        chosen_monthly_base: C.min_monthly_base,
      }),
      year: YEAR,
    });
    const base = ANNUAL_MIN;
    expect(ss.pension).toBeCloseTo(base * C.pension_rate_post1959, 1);
    expect(ss.upf).toBeCloseTo(base * C.upf_rate_post1959, 1);
    expect(ss.health).toBeCloseTo(base * C.health_insurance_rate, 1);
    expect(ss.sickness_maternity).toBeCloseTo(base * C.sickness_maternity_rate, 1);
    const expectedTotal =
      ss.pension + ss.upf + ss.health + ss.sickness_maternity;
    expect(Math.abs(ss.total - expectedTotal)).toBeLessThanOrEqual(0.05);
  });

  it("applies pre-1960 pension split (no UPF, higher 1st pillar rate)", () => {
    const ss = calculateResidualSocialSecurity({
      freelance_income: 100_000,
      profile: profile({
        type: "fully_self_employed",
        birth_year: 1955,
        chosen_monthly_base: C.min_monthly_base,
      }),
      year: YEAR,
    });
    const base = ANNUAL_MIN;
    expect(ss.upf).toBe(0);
    expect(ss.pension).toBeCloseTo(base * C.pension_rate_pre1960, 1);
  });

  it("skips health when health_insured_elsewhere=true", () => {
    const ss = calculateResidualSocialSecurity({
      freelance_income: 100_000,
      profile: profile({
        type: "fully_self_employed",
        birth_year: 1985,
        health_insured_elsewhere: true,
        chosen_monthly_base: C.min_monthly_base,
      }),
      year: YEAR,
    });
    expect(ss.health).toBe(0);
  });
});

describe("social-security — civil_contract_only", () => {
  it("returns zero contributions and a clear note", () => {
    const ss = calculateResidualSocialSecurity({
      freelance_income: 60_000,
      profile: profile({ type: "civil_contract_only", birth_year: 1985 }),
      year: YEAR,
    });
    expect(ss.total).toBe(0);
    expect(ss.pension).toBe(0);
    expect(ss.upf).toBe(0);
    expect(ss.health).toBe(0);
    expect(ss.sickness_maternity).toBe(0);
    expect(ss.residual_base).toBe(0);
    expect(ss.coverage_note).toMatch(/withheld at source/i);
  });
});

describe("social-security — eood_managing_director", () => {
  it("zero residual when EOOD already covers the maximum base", () => {
    const ss = calculateResidualSocialSecurity({
      freelance_income: 80_000,
      profile: profile({
        type: "eood_managing_director",
        birth_year: 1985,
        eood_monthly_insurance_base: C.max_monthly_base, // covers max
      }),
      year: YEAR,
    });
    expect(ss.residual_base).toBe(0);
    expect(ss.total).toBe(0);
    expect(ss.coverage_note).toMatch(/already covers the maximum/i);
  });

  it("residual = annualMax − eoodAnnual when freelance income exceeds the gap", () => {
    const eoodMonthly = 1_000;
    const ss = calculateResidualSocialSecurity({
      freelance_income: 100_000,
      profile: profile({
        type: "eood_managing_director",
        birth_year: 1985,
        eood_monthly_insurance_base: eoodMonthly,
      }),
      year: YEAR,
    });
    const gap = ANNUAL_MAX - eoodMonthly * 12;
    expect(ss.residual_base).toBe(gap);
  });

  it("residual is capped at actual freelance income", () => {
    const ss = calculateResidualSocialSecurity({
      freelance_income: 5_000,
      profile: profile({
        type: "eood_managing_director",
        birth_year: 1985,
        eood_monthly_insurance_base: 1_000, // gap is 33,000
      }),
      year: YEAR,
    });
    expect(ss.residual_base).toBe(5_000);
  });
});

describe("social-security — employed_primary", () => {
  it("zero residual when employer covers the maximum", () => {
    const ss = calculateResidualSocialSecurity({
      freelance_income: 30_000,
      profile: profile({
        type: "employed_primary",
        birth_year: 1985,
        employer_annual_insurable_income: ANNUAL_MAX,
      }),
      year: YEAR,
    });
    expect(ss.residual_base).toBe(0);
    expect(ss.total).toBe(0);
    expect(ss.coverage_note).toMatch(/at or above the annual maximum/i);
  });

  it("residual is the gap, capped at freelance income", () => {
    const ss = calculateResidualSocialSecurity({
      freelance_income: 20_000,
      profile: profile({
        type: "employed_primary",
        birth_year: 1985,
        employer_annual_insurable_income: 30_000,
      }),
      year: YEAR,
    });
    const gap = ANNUAL_MAX - 30_000; // 15,000
    expect(ss.residual_base).toBe(Math.min(gap, 20_000));
  });
});
