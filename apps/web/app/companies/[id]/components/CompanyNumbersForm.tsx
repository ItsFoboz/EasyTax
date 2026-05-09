"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface CompanyNumbers {
  total_revenue: number;
  exp_wages: number;
  exp_operating: number;
  exp_depreciation: number;
  exp_representative: number;
  exp_donations: number;
  exp_other_deductible: number;
  exp_non_deductible: number;
}

const FIELDS: { key: keyof CompanyNumbers; label: string; help?: string; section: "revenue" | "expense" }[] = [
  { key: "total_revenue", label: "Приходи", section: "revenue", help: "Общи приходи на дружеството за годината." },
  { key: "exp_wages", label: "Заплати и осигуровки", section: "expense" },
  { key: "exp_operating", label: "Оперативни разходи", section: "expense", help: "Наем, комунални, материали, услуги." },
  { key: "exp_depreciation", label: "Амортизации", section: "expense", help: "По данъчния амортизационен план." },
  { key: "exp_representative", label: "Представителни разходи", section: "expense", help: "Подлежат на 10% данък по чл. 204 ЗКПО." },
  { key: "exp_donations", label: "Дарения", section: "expense", help: "Признати до 10% от счетоводната печалба." },
  { key: "exp_other_deductible", label: "Други признати разходи", section: "expense" },
  { key: "exp_non_deductible", label: "Непризнати разходи", section: "expense", help: "Глоби, разходи без първични документи и др." },
];

export function CompanyNumbersForm({
  companyId,
  year,
  initial,
}: {
  companyId: string;
  year: number;
  initial: CompanyNumbers;
}) {
  const router = useRouter();
  const [data, setData] = useState<CompanyNumbers>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function update(key: keyof CompanyNumbers, value: number) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch(`/api/companies/${companyId}/numbers?year=${year}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Грешка при запис.");
      return;
    }
    setSavedAt(new Date().toLocaleTimeString("bg-BG"));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-stone-700">Приходи</legend>
        {FIELDS.filter((f) => f.section === "revenue").map((f) => (
          <NumberField key={f.key} field={f} value={data[f.key]} onChange={(v) => update(f.key, v)} />
        ))}
      </fieldset>

      <fieldset className="space-y-3 border-t border-stone-100 pt-4">
        <legend className="text-sm font-medium text-stone-700">Разходи по категории</legend>
        {FIELDS.filter((f) => f.section === "expense").map((f) => (
          <NumberField key={f.key} field={f} value={data[f.key]} onChange={(v) => update(f.key, v)} />
        ))}
      </fieldset>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Запис…" : "Запази"}
        </button>
        {savedAt && <span className="text-xs text-stone-500">Запазено в {savedAt}</span>}
      </div>
    </form>
  );
}

function NumberField({
  field,
  value,
  onChange,
}: {
  field: { key: keyof CompanyNumbers; label: string; help?: string };
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label htmlFor={field.key} className="label">{field.label}</label>
      <input
        id={field.key}
        type="number"
        min={0}
        step="0.01"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="input"
        placeholder="0.00"
      />
      {field.help && <p className="help">{field.help}</p>}
    </div>
  );
}
