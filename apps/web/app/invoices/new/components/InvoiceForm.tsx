"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getTaxConstants, listSupportedYears } from "@easytax/tax-engine";
import { formatNumber, currencyLabel } from "@/lib/format";

type Currency = "EUR" | "BGN" | "USD" | "GBP" | "CHF" | "JPY" | "CAD" | "AUD" | "SEK" | "NOK" | "DKK";

const CURRENCY_OPTIONS: Currency[] = [
  "EUR",
  "BGN",
  "USD",
  "GBP",
  "CHF",
  "JPY",
  "CAD",
  "AUD",
  "SEK",
  "NOK",
  "DKK",
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function InvoiceForm() {
  const router = useRouter();
  const supportedYears = listSupportedYears();
  const minDate = `${supportedYears[0] ?? 2024}-01-01`;
  const maxDate = `${supportedYears[supportedYears.length - 1] ?? new Date().getFullYear()}-12-31`;

  const [issueDate, setIssueDate] = useState(todayIso());
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientCountry, setClientCountry] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [amountOriginal, setAmountOriginal] = useState("");
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [exchangeRate, setExchangeRate] = useState("1");
  const [isB2B, setIsB2B] = useState(true);
  const [isEuClient, setIsEuClient] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve filing currency for the selected issue year. If year isn't configured
  // (e.g. user picked 2027), surface that early as an error.
  const { issueYear, filingCurrency, yearError } = useMemo(() => {
    const m = /^(\d{4})/.exec(issueDate);
    const year = m ? Number(m[1]) : Number.NaN;
    try {
      const c = getTaxConstants(year);
      return { issueYear: year, filingCurrency: c.currency as "BGN" | "EUR", yearError: null as string | null };
    } catch (err) {
      return {
        issueYear: year,
        filingCurrency: "EUR" as const,
        yearError: (err as Error).message,
      };
    }
  }, [issueDate]);

  const amountNum = Number(amountOriginal);
  const rateNum = Number(exchangeRate);
  const amountFiling =
    Number.isFinite(amountNum) && Number.isFinite(rateNum) && amountNum > 0 && rateNum > 0
      ? Math.round(amountNum * rateNum * 100) / 100
      : 0;

  const sameCurrency = currency === filingCurrency;
  const filingSym = currencyLabel(issueYear);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (yearError) {
      setError(yearError);
      return;
    }
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Сумата трябва да е положително число.");
      return;
    }
    if (!Number.isFinite(rateNum) || rateNum <= 0) {
      setError("Валутният курс трябва да е положително число.");
      return;
    }

    setPending(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        issue_date: issueDate,
        invoice_number: invoiceNumber.trim() || null,
        client_name: clientName.trim() || null,
        client_country: clientCountry.trim() || null,
        service_description: serviceDescription.trim() || null,
        amount_original: amountNum,
        currency,
        exchange_rate: rateNum,
        amount_filing: amountFiling,
        is_b2b: isB2B,
        is_eu_client: isEuClient,
        extracted_by: "manual",
        bnb_rate_date: issueDate,
      }),
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Грешка при запис.");
      return;
    }
    router.push("/invoices");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* ─── Дата ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="issue-date" className="label">Дата на издаване</label>
          <input
            id="issue-date"
            type="date"
            required
            min={minDate}
            max={maxDate}
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            className="input"
          />
          {yearError && (
            <p className="mt-1 text-xs text-red-600">{yearError}</p>
          )}
          {!yearError && (
            <p className="help">
              Данъчна година: <strong>{issueYear}</strong> · Подаване в <strong>{filingCurrency}</strong>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="invoice-number" className="label">
            Номер на фактура <span className="text-stone-400">(незадължително)</span>
          </label>
          <input
            id="invoice-number"
            type="text"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            className="input font-mono"
            placeholder="напр. 0000000123"
          />
        </div>
      </div>

      {/* ─── Клиент ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="client-name" className="label">Клиент</label>
          <input
            id="client-name"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="input"
            placeholder="Име на дружество или лице"
          />
        </div>
        <div>
          <label htmlFor="client-country" className="label">
            Държава <span className="text-stone-400">(незадължително)</span>
          </label>
          <input
            id="client-country"
            type="text"
            value={clientCountry}
            onChange={(e) => setClientCountry(e.target.value)}
            className="input"
            placeholder="напр. Германия / Germany"
          />
        </div>
      </div>

      {/* ─── Сума + валута ─────────────────────────────────────────────── */}
      <div className="rounded-lg border border-stone-200 bg-stone-50/40 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="amount" className="label">Сума</label>
            <input
              id="amount"
              type="number"
              required
              min={0}
              step="0.01"
              value={amountOriginal}
              onChange={(e) => setAmountOriginal(e.target.value)}
              className="input"
              placeholder="0.00"
            />
          </div>
          <div>
            <label htmlFor="currency" className="label">Валута</label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => {
                const next = e.target.value as Currency;
                setCurrency(next);
                if (next === filingCurrency) setExchangeRate("1");
              }}
              className="input"
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="rate" className="label">
              Курс (1 {currency} → {filingCurrency})
            </label>
            <input
              id="rate"
              type="number"
              required
              min={0}
              step="0.000001"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
              disabled={sameCurrency}
              className="input"
            />
            {sameCurrency ? (
              <p className="help">Същата валута — курсът е 1.</p>
            ) : (
              <p className="help">
                Използвайте официалния курс на БНБ за датата на издаване. (Автоматично изтегляне — скоро.)
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-baseline justify-between border-t border-stone-200 pt-3">
          <span className="text-sm text-stone-600">Сума в данъчна валута</span>
          <span className="text-lg font-semibold tabular-nums text-stone-900">
            {amountFiling > 0 ? formatNumber(amountFiling) : "0,00"} {filingSym}
          </span>
        </div>
      </div>

      {/* ─── Услуга + B2B ──────────────────────────────────────────────── */}
      <div>
        <label htmlFor="service" className="label">
          Описание на услугата <span className="text-stone-400">(незадължително)</span>
        </label>
        <input
          id="service"
          type="text"
          value={serviceDescription}
          onChange={(e) => setServiceDescription(e.target.value)}
          className="input"
          placeholder="напр. Консултантски услуги — март 2026"
        />
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={isB2B}
            onChange={(e) => setIsB2B(e.target.checked)}
          />
          B2B (клиентът е дружество)
        </label>
        <label className="flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={isEuClient}
            onChange={(e) => setIsEuClient(e.target.checked)}
          />
          Клиент в ЕС
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
          onClick={() => router.push("/invoices")}
          className="btn-secondary"
        >
          Отказ
        </button>
        <button
          type="submit"
          disabled={pending || amountFiling <= 0 || Boolean(yearError)}
          className="btn-primary"
        >
          {pending ? "Запис…" : "Запази фактурата"}
        </button>
      </div>
    </form>
  );
}
