"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getTaxConstants } from "@easytax/tax-engine";
import {
  calculateDividendWithholding,
  declaration142Deadline,
} from "@easytax/corporate-tax-engine";
import { formatMoney, currencyLabel } from "@/lib/format";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function DividendForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [distributionDate, setDistributionDate] = useState(todayIso());
  const [recipientName, setRecipientName] = useState("");
  const [recipientEgn, setRecipientEgn] = useState("");
  const [amount, setAmount] = useState("");
  const [withholdingPaid, setWithholdingPaid] = useState(false);
  const [filed, setFiled] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { distYear, currency, yearError, deadline } = useMemo(() => {
    const m = /^(\d{4})/.exec(distributionDate);
    const y = m ? Number(m[1]) : Number.NaN;
    let cur: "BGN" | "EUR" = "EUR";
    let err: string | null = null;
    try {
      cur = getTaxConstants(y).currency;
    } catch (e) {
      err = (e as Error).message;
    }
    let dl: string | null = null;
    try {
      dl = declaration142Deadline(distributionDate);
    } catch {
      // ignore — surface in form-level validation
    }
    return { distYear: y, currency: cur, yearError: err, deadline: dl };
  }, [distributionDate]);

  const amountNum = Number(amount);
  const calc = calculateDividendWithholding(amountNum);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (yearError) return setError(yearError);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      return setError("Сумата трябва да е положително число.");
    }
    if (recipientEgn && !/^\d{10}$/.test(recipientEgn)) {
      return setError("ЕГН трябва да е 10 цифри.");
    }

    setPending(true);
    const res = await fetch(`/api/companies/${companyId}/dividends`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        distribution_date: distributionDate,
        recipient_name: recipientName.trim() || null,
        recipient_egn: recipientEgn || null,
        amount_filing: amountNum,
        withholding_paid: withholdingPaid,
        declaration_142_filed: filed,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return setError(body.error ?? "Грешка при запис.");
    }
    router.push(`/companies/${companyId}/dividends`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="dist-date" className="label">Дата на разпределение</label>
        <input
          id="dist-date"
          type="date"
          required
          value={distributionDate}
          onChange={(e) => setDistributionDate(e.target.value)}
          className="input"
        />
        {yearError ? (
          <p className="mt-1 text-xs text-red-600">{yearError}</p>
        ) : (
          <p className="help">
            Година: <strong>{distYear}</strong> · Валута: <strong>{currency}</strong>
            {deadline && (
              <>
                {" "}· Краен срок за чл. 142: <strong>{deadline}</strong>
              </>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="recipient-name" className="label">Получател</label>
          <input
            id="recipient-name"
            type="text"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            className="input"
            placeholder="Име на физическо лице"
          />
        </div>
        <div>
          <label htmlFor="recipient-egn" className="label">
            ЕГН <span className="text-stone-400">(незадължително)</span>
          </label>
          <input
            id="recipient-egn"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            value={recipientEgn}
            onChange={(e) => setRecipientEgn(e.target.value.replace(/\D/g, ""))}
            className="input font-mono"
            placeholder="10 цифри"
          />
        </div>
      </div>

      <div className="rounded-lg border border-stone-200 bg-stone-50/40 p-4">
        <label htmlFor="amount" className="label">Брутна сума ({currencyLabel(distYear)})</label>
        <input
          id="amount"
          type="number"
          required
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input"
          placeholder="0.00"
        />
        {calc.gross > 0 && (
          <dl className="mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-stone-600">Удържан 5%</dt>
              <dd className="tabular-nums font-medium text-brand-700">
                {formatMoney(calc.withholding, distYear)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-1.5">
              <dt className="text-stone-600">Нетно към получателя</dt>
              <dd className="tabular-nums font-medium">
                {formatMoney(calc.net, distYear)}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={withholdingPaid}
            onChange={(e) => setWithholdingPaid(e.target.checked)}
          />
          Удържаният данък е платен в НАП
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={filed}
            onChange={(e) => setFiled(e.target.checked)}
          />
          Декларацията по чл. 142 е подадена
        </label>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push(`/companies/${companyId}/dividends`)}
          className="btn-secondary"
        >
          Отказ
        </button>
        <button
          type="submit"
          disabled={pending || calc.gross <= 0 || Boolean(yearError)}
          className="btn-primary"
        >
          {pending ? "Запис…" : "Запази"}
        </button>
      </div>
    </form>
  );
}
