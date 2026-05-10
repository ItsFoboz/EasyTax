"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getTaxConstants,
  type InsuranceProfileType,
  type TaxConstants,
} from "@easytax/tax-engine";
import { formatNumber, currencyLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export interface WizardData {
  // Step 1
  profile_type?: InsuranceProfileType;

  // Step 2 — profile-specific
  eood_monthly_insurance_base?: number;
  employer_annual_insurable_income?: number;
  chosen_monthly_base?: number;
  health_insured_elsewhere?: boolean;

  // Step 3
  full_name?: string;
  egn?: string;
  birth_year?: number;
  bulstat_number?: string;
  vat_registered?: boolean;

  // Step 4
  tax_year?: number;
}

const STEPS = ["Тип осигуряване", "Детайли", "Лични данни", "Данъчна година"] as const;

export function Wizard({ userEmail }: { userId: string; userEmail: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>({
    tax_year: new Date().getFullYear(),
    health_insured_elsewhere: false,
    vat_registered: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  // Show step-2 hints in the chosen tax year's currency. If not yet picked,
  // default to the current calendar year (which is EUR for 2026+).
  const yearForHints = data.tax_year ?? new Date().getFullYear();
  const constants = getTaxConstants(yearForHints);

  async function submit() {
    setSubmitting(true);
    setError(null);
    // Backfill the legal minimum monthly base for fully_self_employed users
    // who never touched the slider (it shows the minimum by default; they
    // accepted that implicitly by clicking Next).
    const payload =
      data.profile_type === "fully_self_employed" && data.chosen_monthly_base === undefined
        ? { ...data, chosen_monthly_base: getTaxConstants(yearForHints).min_monthly_base }
        : data;
    const res = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Грешка при запис.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <Stepper current={step} />
      <div className="mt-6 card">
        {step === 0 && <StepProfileType data={data} update={update} />}
        {step === 1 && <StepProfileFields data={data} update={update} constants={constants} />}
        {step === 2 && <StepPersonalDetails data={data} update={update} userEmail={userEmail} />}
        {step === 3 && <StepTaxYear data={data} update={update} />}

        {error && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="mt-8 flex justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-secondary"
          >
            Назад
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance(step, data)}
              className="btn-primary"
            >
              Напред
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !canAdvance(step, data)}
              className="btn-primary"
            >
              {submitting ? "Запис…" : "Завърши"}
            </button>
          )}
        </div>
      </div>

    </div>
  );
}

function canAdvance(step: number, d: WizardData): boolean {
  switch (step) {
    case 0:
      return Boolean(d.profile_type);
    case 1:
      if (d.profile_type === "eood_managing_director") return typeof d.eood_monthly_insurance_base === "number";
      if (d.profile_type === "employed_primary") return typeof d.employer_annual_insurable_income === "number";
      // fully_self_employed: the slider always has a displayed default (legal minimum);
      // the user is allowed to advance without explicitly dragging it. The submit
      // handler fills in the minimum if state is still undefined.
      return true;
    case 2:
      return Boolean(d.full_name && d.egn && d.birth_year);
    case 3:
      return Boolean(d.tax_year);
    default:
      return false;
  }
}

function Stepper({ current }: { current: number }) {
  return (
    <div className="space-y-3">
      <ol className="flex items-center">
        {STEPS.map((label, i) => {
          const state = i < current ? "done" : i === current ? "active" : "pending";
          return (
            <li key={label} className="flex flex-1 items-center last:flex-none">
              <span
                className={
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium " +
                  (state === "active"
                    ? "bg-brand-600 text-white"
                    : state === "done"
                      ? "bg-brand-100 text-brand-700"
                      : "bg-stone-100 text-stone-400")
                }
              >
                {i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span
                  className={
                    "mx-2 h-px flex-1 " +
                    (i < current ? "bg-brand-300" : "bg-stone-200")
                  }
                />
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-xs text-stone-500">
        Стъпка {current + 1} от {STEPS.length} · <span className="font-medium text-stone-700">{STEPS[current]}</span>
      </p>
    </div>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────────
function StepProfileType({
  data,
  update,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
}) {
  const options: { value: InsuranceProfileType; title: string; subtitle: string }[] = [
    {
      value: "fully_self_employed",
      title: "Самоосигуряващо се лице",
      subtitle: "Без трудов договор и без собствено дружество.",
    },
    {
      value: "eood_managing_director",
      title: "Имам ЕООД, което ме осигурява",
      subtitle: "Дружеството ви плаща социалните осигуровки.",
    },
    {
      value: "employed_primary",
      title: "Имам трудов договор като основна работа",
      subtitle: "Работодателят ви покрива осигуровките.",
    },
    {
      value: "civil_contract_only",
      title: "Само граждански договори",
      subtitle: "Осигуровките се удържат от платеца.",
    },
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold">Какъв е статусът ви?</h2>
      <p className="mt-1 text-sm text-stone-600">
        Това определя как се изчисляват остатъчните осигуровки.
      </p>
      <div className="mt-4 space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={
              "block cursor-pointer rounded-lg border p-4 transition " +
              (data.profile_type === opt.value
                ? "border-brand-500 bg-brand-50"
                : "border-stone-200 bg-white hover:border-stone-300")
            }
          >
            <input
              type="radio"
              name="profile_type"
              value={opt.value}
              checked={data.profile_type === opt.value}
              onChange={() => update("profile_type", opt.value)}
              className="sr-only"
            />
            <div className="font-medium text-stone-900">{opt.title}</div>
            <div className="mt-1 text-sm text-stone-600">{opt.subtitle}</div>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────────
function StepProfileFields({
  data,
  update,
  constants,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
  constants: TaxConstants;
}) {
  const sym = currencyLabel(constants.year);
  const minBase = constants.min_monthly_base;
  const maxBase = constants.max_monthly_base;

  if (data.profile_type === "civil_contract_only") {
    return (
      <div>
        <h2 className="text-lg font-semibold">Няма допълнителни данни</h2>
        <p className="mt-2 text-sm text-stone-600">
          При граждански договори осигуровките се удържат от платеца. Преминете към следваща стъпка.
        </p>
      </div>
    );
  }

  if (data.profile_type === "eood_managing_director") {
    return (
      <div>
        <h2 className="text-lg font-semibold">Осигурителен доход на ЕООД</h2>
        <p className="mt-1 text-sm text-stone-600">
          На каква месечна база ви осигурява вашето ЕООД?
        </p>
        <div className="mt-4">
          <label htmlFor="eood-base" className="label">Месечна база ({sym})</label>
          <input
            id="eood-base"
            type="number"
            min={minBase}
            max={maxBase}
            step={1}
            value={data.eood_monthly_insurance_base ?? ""}
            onChange={(e) => update("eood_monthly_insurance_base", Number(e.target.value))}
            className="input"
            placeholder={`напр. ${Math.round((minBase + maxBase) / 2)}`}
          />
          <p className="help">
            За {constants.year} г.: минимум {formatNumber(minBase)} {sym}, максимум {formatNumber(maxBase)} {sym}.
          </p>
        </div>
      </div>
    );
  }

  if (data.profile_type === "employed_primary") {
    return (
      <div>
        <h2 className="text-lg font-semibold">Доход чрез работодател</h2>
        <p className="mt-1 text-sm text-stone-600">
          Какъв беше приблизително осигурителният ви доход през работодателя за избраната година?
        </p>
        <div className="mt-4">
          <label htmlFor="employer-income" className="label">Осигурителен доход ({sym}/година)</label>
          <input
            id="employer-income"
            type="number"
            min={0}
            step={1}
            value={data.employer_annual_insurable_income ?? ""}
            onChange={(e) => update("employer_annual_insurable_income", Number(e.target.value))}
            className="input"
            placeholder={`напр. ${formatNumber(maxBase * 6)}`}
          />
          <p className="help">
            Брутният размер, който работодателят ви декларира за осигурителни цели. Намира се в фиша или
            попитайте отдел Човешки ресурси.
          </p>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <input
            id="health"
            type="checkbox"
            checked={data.health_insured_elsewhere ?? true}
            onChange={(e) => update("health_insured_elsewhere", e.target.checked)}
          />
          <label htmlFor="health" className="text-sm text-stone-700">
            Здравно осигурен/а съм чрез работодателя
          </label>
        </div>
      </div>
    );
  }

  // fully_self_employed
  const value = data.chosen_monthly_base ?? minBase;
  return (
    <div>
      <h2 className="text-lg font-semibold">Избор на осигурителна база</h2>
      <p className="mt-1 text-sm text-stone-600">
        На каква месечна база искате да се осигурявате? (за {constants.year} г.)
      </p>
      <div className="mt-4">
        <input
          type="range"
          min={minBase}
          max={maxBase}
          step={1}
          value={value}
          onChange={(e) => update("chosen_monthly_base", Number(e.target.value))}
          className="w-full"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
          <span>{formatNumber(minBase)} {sym} (минимум)</span>
          <span className="text-base font-semibold text-stone-900">
            {formatNumber(value)} {sym}/мес.
          </span>
          <span>{formatNumber(maxBase)} {sym} (максимум)</span>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => update("chosen_monthly_base", minBase)}
          >
            Минимум
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => update("chosen_monthly_base", maxBase)}
          >
            Максимум
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────────
function StepPersonalDetails({
  data,
  update,
  userEmail,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
  userEmail: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">Лични данни</h2>
      <p className="mt-1 text-sm text-stone-600">
        Необходими за генериране на декларацията.
      </p>
      <p className="mt-1 text-xs text-stone-500">Имейл: {userEmail}</p>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="name" className="label">Три имена</label>
          <input
            id="name"
            type="text"
            value={data.full_name ?? ""}
            onChange={(e) => update("full_name", e.target.value)}
            className="input"
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="egn" className="label">ЕГН</label>
          <input
            id="egn"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            value={data.egn ?? ""}
            onChange={(e) => update("egn", e.target.value.replace(/\D/g, ""))}
            className="input font-mono"
          />
          <p className="help">10 цифри. Използва се само за генериране на документите. Не се споделя с трети страни.</p>
        </div>
        <div>
          <label htmlFor="birth-year" className="label">Година на раждане</label>
          <input
            id="birth-year"
            type="number"
            min={1920}
            max={new Date().getFullYear()}
            value={data.birth_year ?? ""}
            onChange={(e) => update("birth_year", Number(e.target.value))}
            className="input"
          />
          <p className="help">Определя пенсионния стълб (преди или след 1960 г.).</p>
        </div>
        <div>
          <label htmlFor="bulstat" className="label">БУЛСТАТ <span className="text-stone-400">(незадължително)</span></label>
          <input
            id="bulstat"
            type="text"
            value={data.bulstat_number ?? ""}
            onChange={(e) => update("bulstat_number", e.target.value)}
            className="input font-mono"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            id="vat"
            type="checkbox"
            checked={data.vat_registered ?? false}
            onChange={(e) => update("vat_registered", e.target.checked)}
          />
          <label htmlFor="vat" className="text-sm text-stone-700">
            Регистриран/а съм по ЗДДС
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4 ───────────────────────────────────────────────────────────────────
function StepTaxYear({
  data,
  update,
}: {
  data: WizardData;
  update: <K extends keyof WizardData>(k: K, v: WizardData[K]) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 2, currentYear - 1, currentYear];
  return (
    <div>
      <h2 className="text-lg font-semibold">За коя данъчна година подавате?</h2>
      <p className="mt-1 text-sm text-stone-600">
        По подразбиране — предходната календарна година.
        2024 и 2025 са в лева; 2026 и нататък — в евро.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {years.map((y) => {
          const c = (() => { try { return getTaxConstants(y); } catch { return null; } })();
          return (
            <button
              key={y}
              type="button"
              onClick={() => update("tax_year", y)}
              disabled={!c}
              className={
                "rounded-lg border p-4 text-center transition disabled:opacity-50 " +
                (data.tax_year === y
                  ? "border-brand-500 bg-brand-50 text-brand-900"
                  : "border-stone-200 bg-white hover:border-stone-300")
              }
            >
              <div className="text-lg font-semibold">{y}</div>
              <div className="text-xs text-stone-500">
                {c ? c.currency : "не е налична"}
                {y === currentYear - 1 && c ? " · препоръчано" : ""}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
