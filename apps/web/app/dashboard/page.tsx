import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  calculateTax,
  getTaxConstants,
  type Invoice,
  type InsuranceProfile,
} from "@easytax/tax-engine";
import { formatMoney, formatPercent, formatNumber, currencyLabel } from "@/lib/format";
import { getDeadlines, nextDeadline, daysUntil } from "@/lib/deadlines";

export default async function DashboardPage() {
  const { user, supabase } = await requireUser();

  const { data: profileRow } = await supabase
    .from("insurance_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!profileRow) {
    return (
      <div className="card">
        <h2 className="text-lg font-semibold">Профилът ви още не е настроен</h2>
        <p className="mt-2 text-sm text-stone-600">Завършете онбординга, за да започнете.</p>
        <Link href="/onboarding" className="btn-primary mt-4 inline-flex">
          Настройка
        </Link>
      </div>
    );
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("birth_year")
    .eq("id", user.id)
    .maybeSingle();

  // Pick the most recent tax_years row the user has set up.
  const { data: taxYearRow } = await supabase
    .from("tax_years")
    .select("year")
    .eq("user_id", user.id)
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();
  const taxYear = taxYearRow?.year ?? new Date().getFullYear() - 1;
  const constants = getTaxConstants(taxYear);

  const { data: invoiceRows = [] } = await supabase
    .from("invoices")
    .select("issue_date, amount_bgn, amount_eur, amount_original, currency, exchange_rate")
    .eq("user_id", user.id)
    .gte("issue_date", `${taxYear}-01-01`)
    .lte("issue_date", `${taxYear}-12-31`);

  const invoices: Invoice[] = (invoiceRows ?? []).map((r) => ({
    issue_date: r.issue_date,
    amount_original: Number(r.amount_original ?? 0),
    currency: r.currency,
    exchange_rate: Number(r.exchange_rate ?? 1),
    // Pick the column matching the tax year's filing currency.
    amount: Number(constants.currency === "EUR" ? r.amount_eur ?? 0 : r.amount_bgn ?? 0),
  }));

  const profile: InsuranceProfile = {
    type: profileRow.type,
    birth_year: userRow?.birth_year ?? new Date().getFullYear() - 30,
    health_insured_elsewhere: profileRow.health_insured_elsewhere ?? false,
    eood_monthly_insurance_base: profileRow.eood_monthly_insurance_base ?? undefined,
    employer_annual_insurable_income: profileRow.employer_annual_insurable_income ?? undefined,
    chosen_monthly_base: profileRow.chosen_monthly_base ?? undefined,
  };

  const result = calculateTax(invoices, profile, taxYear);

  const deadlines = getDeadlines(taxYear, profile.type);
  const upcoming = nextDeadline(deadlines);

  if (result.status === "requires_accountant") {
    return (
      <div className="card border-amber-300 bg-amber-50">
        <h2 className="text-lg font-semibold text-amber-900">Случаят изисква счетоводител</h2>
        <p className="mt-2 text-sm text-amber-800">{result.reason}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Табло — {taxYear}</h1>
        <p className="mt-1 text-sm text-stone-600">
          Изчисленията се актуализират автоматично при добавяне на нова фактура.
          {result.currency === "BGN" && " Подаване в лева (преди преминаването към евро на 1 януари 2026 г.)."}
          {result.currency === "EUR" && " Подаване в евро."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Брутен доход" value={formatMoney(result.gross_income, taxYear)} />
        <Stat label="Дължим данък" value={formatMoney(result.income_tax, taxYear)} />
        <Stat label="Осигуровки (остатъчно)" value={formatMoney(result.social_security.total, taxYear)} />
        <Stat label="Ефективна ставка" value={formatPercent(result.effective_rate)} />
      </div>

      {result.vat_proximity_percent >= 50 && (
        <div className="card">
          <h3 className="text-sm font-medium text-stone-700">Близост до прага за регистрация по ЗДДС</h3>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className={
                "h-full transition-all " +
                (result.vat_warning ? "bg-amber-500" : "bg-brand-500")
              }
              style={{ width: `${Math.min(100, result.vat_proximity_percent)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-stone-500">{formatPercent(result.vat_proximity_percent)} от прага</span>
            {result.vat_warning && (
              <span className="font-medium text-amber-700">
                Достигнат е {formatPercent(result.vat_proximity_percent)} от прага от {formatNumber(constants.vat_threshold)} {currencyLabel(taxYear)}. Препоръчваме консултация със счетоводител.
              </span>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-semibold">Разбивка</h2>
        {result.gross_income === 0 ? (
          <div className="mt-4 rounded-lg bg-stone-50 p-6 text-center">
            <p className="text-sm text-stone-700">
              Все още няма приходи за {taxYear} г.
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Качете фактура, за да видите разбивката.
            </p>
            <Link href="/invoices" className="btn-secondary mt-4 inline-flex">
              Към фактури
            </Link>
          </div>
        ) : (
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Брутен доход" value={formatMoney(result.gross_income, taxYear)} />
          <Row label="− 25% нормативно признати разходи" value={`− ${formatMoney(result.normative_expenses, taxYear)}`} />
          <Divider />
          <Row label="Междинна основа" value={formatMoney(result.intermediate_tax_base, taxYear)} bold />
          <Row label="− Осигуровки (остатъчно)" value={`− ${formatMoney(result.social_security.total, taxYear)}`} />
          <p className="ml-2 text-xs text-stone-500">{result.social_security.coverage_note}</p>
          <Divider />
          <Row label="Облагаема основа" value={formatMoney(result.final_taxable_base, taxYear)} bold />
          <Row label="Данък върху доходите (10%)" value={formatMoney(result.income_tax, taxYear)} bold />
        </dl>
        )}
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold">Авансови вноски</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Quarter label={`Q1 (до 15.04.${taxYear})`} value={result.quarterly.q1} year={taxYear} />
          <Quarter label={`Q2 (до 15.07.${taxYear})`} value={result.quarterly.q2} year={taxYear} />
          <Quarter label={`Q3 (до 15.10.${taxYear})`} value={result.quarterly.q3} year={taxYear} />
          <Quarter label={`Q4 — изравняване (до 30.04.${taxYear + 1})`} value={result.quarterly.q4_reconciliation} year={taxYear} />
        </div>
      </div>

      {upcoming && (
        <div className="card">
          <h2 className="text-lg font-semibold">Следваща дата</h2>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <div className="text-base font-medium">{upcoming.label_bg}</div>
              <div className="text-sm text-stone-600">{upcoming.description_bg}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold tabular-nums">
                {daysUntil(upcoming.date)} дни
              </div>
              <div className="text-xs text-stone-500">{upcoming.date}</div>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-stone-500">
        Изчисленията са на база стандартното 25% нормативно признати разходи и въведения от вас профил.
        Не представляват данъчен съвет. За сложни случаи — чужд доход, спогодби за избягване на двойно
        данъчно облагане, регистрационни промени през годината — се консултирайте с правоспособен счетоводител.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={"flex items-baseline justify-between " + (bold ? "font-semibold" : "")}>
      <dt className="text-stone-700">{label}</dt>
      <dd className="tabular-nums text-stone-900">{value}</dd>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-dashed border-stone-200" />;
}

function Quarter({ label, value, year }: { label: string; value: number; year: number }) {
  return (
    <div className="rounded-lg border border-stone-200 p-3">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(value, year)}</div>
    </div>
  );
}
