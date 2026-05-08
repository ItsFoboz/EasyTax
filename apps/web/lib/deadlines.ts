import type { InsuranceProfileType } from "@easytax/tax-engine";

export interface Deadline {
  id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  label_bg: string;
  description_bg: string;
  /** Relevant only to certain profile types — undefined = applies to everyone. */
  applies_to?: InsuranceProfileType[];
}

/**
 * Returns all relevant deadlines for a given tax year + profile.
 * Quarterly advances apply to everyone earning income; the annual declaration
 * is universal; Form 1 / Form 6 apply only to self-insured persons.
 */
export function getDeadlines(year: number, profileType: InsuranceProfileType): Deadline[] {
  const all: Deadline[] = [
    {
      id: "q1",
      date: `${year}-04-15`,
      label_bg: "Авансова вноска Q1",
      description_bg: "Дължимият данък за първото тримесечие.",
    },
    {
      id: "q2",
      date: `${year}-07-15`,
      label_bg: "Авансова вноска Q2",
      description_bg: "Дължимият данък за второто тримесечие.",
    },
    {
      id: "q3",
      date: `${year}-10-15`,
      label_bg: "Авансова вноска Q3",
      description_bg: "Дължимият данък за третото тримесечие.",
    },
    {
      id: "annual",
      date: `${year + 1}-04-30`,
      label_bg: "Годишна декларация (чл. 50)",
      description_bg: "Подаване на годишна данъчна декларация в НАП.",
    },
    {
      id: "form6",
      date: `${year + 1}-04-30`,
      label_bg: "Декларация образец 6",
      description_bg: "Годишно деклариране на осигурителни вноски.",
      applies_to: ["fully_self_employed"],
    },
  ];

  return all.filter((d) => !d.applies_to || d.applies_to.includes(profileType));
}

/** Returns the next deadline strictly after `now`, or null if none remain. */
export function nextDeadline(deadlines: Deadline[], now: Date = new Date()): Deadline | null {
  const future = deadlines
    .filter((d) => new Date(d.date) > now)
    .sort((a, b) => a.date.localeCompare(b.date));
  return future[0] ?? null;
}

export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const target = new Date(isoDate);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
