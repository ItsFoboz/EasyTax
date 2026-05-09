"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewCompanyForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [bulstat, setBulstat] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [vatRegistered, setVatRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/companies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        bulstat: bulstat.trim() || null,
        vat_number: vatNumber.trim() || null,
        vat_registered: vatRegistered,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Грешка при запис.");
      return;
    }
    const { company } = await res.json();
    router.push(`/companies/${company.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">Име на дружеството</label>
        <input
          id="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="напр. Акме ЕООД"
        />
      </div>
      <div>
        <label htmlFor="bulstat" className="label">БУЛСТАТ / ЕИК</label>
        <input
          id="bulstat"
          value={bulstat}
          onChange={(e) => setBulstat(e.target.value.replace(/\D/g, ""))}
          className="input font-mono"
          maxLength={13}
          placeholder="9 или 13 цифри"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          id="vat-registered"
          type="checkbox"
          checked={vatRegistered}
          onChange={(e) => setVatRegistered(e.target.checked)}
        />
        <label htmlFor="vat-registered" className="text-sm text-stone-700">
          Регистрирано по ЗДДС
        </label>
      </div>
      {vatRegistered && (
        <div>
          <label htmlFor="vat-number" className="label">ДДС номер</label>
          <input
            id="vat-number"
            value={vatNumber}
            onChange={(e) => setVatNumber(e.target.value.toUpperCase())}
            className="input font-mono"
            placeholder="напр. BG123456789"
          />
        </div>
      )}

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button type="submit" disabled={pending || !name.trim()} className="btn-primary w-full">
        {pending ? "Запис…" : "Създай дружество"}
      </button>
    </form>
  );
}
