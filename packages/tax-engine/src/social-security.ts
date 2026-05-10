import { getTaxConstants } from "./constants/index";
import type {
  InsuranceProfile,
  SocialSecurityBreakdown,
  SocialSecurityInput,
} from "./types";

/**
 * Calculates the residual social security a freelancer owes on top of any
 * coverage they already have through employment, an EOOD, or civil contracts.
 *
 * The "residual" is the part of the annual maximum insurable base that has
 * NOT yet been covered by another source. The freelancer pays contributions
 * on that gap, capped at their actual freelance income (you can never owe
 * SS on income you didn't earn).
 *
 * Pension rate split:
 *   - birth_year <  1960: full first pillar at pension_rate_pre1960
 *   - birth_year >= 1960: pension_rate_post1959 (1st pillar) + upf_rate_post1959 (2nd)
 *
 * Health: skipped entirely if profile.health_insured_elsewhere === true.
 *
 * Sickness/maternity: applied at sickness_maternity_rate. Per spec, it is
 * always included in the residual SS calculation regardless of profile.
 */
export function calculateResidualSocialSecurity(
  input: SocialSecurityInput,
): SocialSecurityBreakdown {
  const { freelance_income, profile, year } = input;
  const c = getTaxConstants(year);
  const annualMax = c.max_monthly_base * 12;
  const annualMin = c.min_monthly_base * 12;

  const { residualBase, coverageNote } = resolveResidualBase({
    profile,
    freelanceIncome: freelance_income,
    annualMax,
    annualMin,
    currency: c.currency,
  });

  const isPost1959 = profile.birth_year >= 1960;
  const pensionRate = isPost1959 ? c.pension_rate_post1959 : c.pension_rate_pre1960;
  const upfRate = isPost1959 ? c.upf_rate_post1959 : 0;
  const healthRate = profile.health_insured_elsewhere ? 0 : c.health_insurance_rate;
  const sicknessRate = c.sickness_maternity_rate;

  const pension = round2(residualBase * pensionRate);
  const upf = round2(residualBase * upfRate);
  const health = round2(residualBase * healthRate);
  const sickness_maternity = round2(residualBase * sicknessRate);
  const total = round2(pension + upf + health + sickness_maternity);

  return {
    pension,
    health,
    sickness_maternity,
    upf,
    total,
    coverage_note: coverageNote,
    residual_base: round2(residualBase),
  };
}

interface ResolveArgs {
  profile: InsuranceProfile;
  freelanceIncome: number;
  annualMax: number;
  annualMin: number;
  currency: "BGN" | "EUR";
}

interface ResolveResult {
  residualBase: number;
  coverageNote: string;
}

function resolveResidualBase(args: ResolveArgs): ResolveResult {
  const { profile, freelanceIncome, annualMax, annualMin, currency } = args;
  const sym = currency === "EUR" ? "€" : "лв.";

  switch (profile.type) {
    case "civil_contract_only": {
      return {
        residualBase: 0,
        coverageNote:
          "Осигуровките се удържат от платеца. Не дължите допълнителни вноски върху дохода от свободна професия.",
      };
    }

    case "fully_self_employed": {
      const monthlyChoice = profile.chosen_monthly_base ?? annualMin / 12;
      const clampedMonthly = clamp(monthlyChoice, annualMin / 12, annualMax / 12);
      const chosenAnnual = clampedMonthly * 12;
      // You also can't owe SS on more than you actually earned in the year.
      const residualBase = Math.min(chosenAnnual, Math.max(freelanceIncome, 0));
      const note = describeFullySelfEmployed({
        freelanceIncome,
        chosenAnnual,
        residualBase,
        clampedMonthly,
        originalMonthly: monthlyChoice,
        annualMin,
        annualMax,
        sym,
      });
      return { residualBase, coverageNote: note };
    }

    case "eood_managing_director": {
      const eoodMonthly = profile.eood_monthly_insurance_base ?? 0;
      const eoodAnnual = eoodMonthly * 12;
      const gap = Math.max(0, annualMax - eoodAnnual);
      const residualBase = Math.min(gap, Math.max(freelanceIncome, 0));
      const note =
        gap === 0
          ? `Вашето ЕООД вече покрива максималната годишна осигурителна база (${fmt(annualMax)} ${sym}). Не дължите остатъчни осигуровки върху дохода от свободна професия.`
          : `Вашето ЕООД ви осигурява на ${fmt(eoodMonthly)} ${sym}/мес. (${fmt(eoodAnnual)} ${sym}/год.). Разлика до годишния максимум: ${fmt(gap)} ${sym}. Дължите вноски върху по-малката от тази разлика и реалния доход от свободна професия (${fmt(freelanceIncome)} ${sym}) — т.е. ${fmt(residualBase)} ${sym}.`;
      return { residualBase, coverageNote: note };
    }

    case "employed_primary": {
      const employerAnnual = profile.employer_annual_insurable_income ?? 0;
      const gap = Math.max(0, annualMax - employerAnnual);
      const residualBase = Math.min(gap, Math.max(freelanceIncome, 0));
      const note =
        gap === 0
          ? `Работодателят ви декларира осигурителен доход на или над годишния максимум (${fmt(annualMax)} ${sym}). Не дължите остатъчни осигуровки върху дохода от свободна професия.`
          : `Работодателят ви декларира ${fmt(employerAnnual)} ${sym} осигурителен доход. Разлика до годишния максимум: ${fmt(gap)} ${sym}. Дължите вноски върху по-малката от тази разлика и реалния доход от свободна професия (${fmt(freelanceIncome)} ${sym}) — т.е. ${fmt(residualBase)} ${sym}.`;
      return { residualBase, coverageNote: note };
    }

    default: {
      const exhaustive: never = profile.type;
      throw new Error(`Unhandled insurance profile type: ${String(exhaustive)}`);
    }
  }
}

interface FseNoteArgs {
  freelanceIncome: number;
  chosenAnnual: number;
  residualBase: number;
  clampedMonthly: number;
  originalMonthly: number;
  annualMin: number;
  annualMax: number;
  sym: string;
}

function describeFullySelfEmployed(args: FseNoteArgs): string {
  const { freelanceIncome, chosenAnnual, residualBase, clampedMonthly, originalMonthly, annualMin, annualMax, sym } = args;
  const clampNote =
    originalMonthly < annualMin / 12
      ? ` (вдигнато от ${fmt(originalMonthly)} ${sym} до законовия минимум от ${fmt(annualMin / 12)} ${sym}/мес.)`
      : originalMonthly > annualMax / 12
        ? ` (ограничено до законовия максимум от ${fmt(annualMax / 12)} ${sym}/мес.)`
        : "";
  if (residualBase < chosenAnnual) {
    return `Самоосигуряване на избрана месечна база ${fmt(clampedMonthly)} ${sym}${clampNote}. Ограничено до реалния годишен доход от свободна професия от ${fmt(freelanceIncome)} ${sym}.`;
  }
  return `Самоосигуряване на избрана месечна база ${fmt(clampedMonthly)} ${sym}${clampNote} (${fmt(chosenAnnual)} ${sym}/год.).`;
}

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}
