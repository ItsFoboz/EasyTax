import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  calculateCorporateTax,
  type CorporateExpenseBreakdown,
} from "@easytax/corporate-tax-engine";
import { getTaxConstants } from "@easytax/tax-engine";
import { formatMoney, formatPercent, currencyLabel } from "@/lib/format";
import { CompanyNumbersForm } from "./components/CompanyNumbersForm";

interface CompanyTaxYearRow {
  year: number;
  total_revenue: number | string;
  exp_wages: number | string;
  exp_operating: number | string;
  exp_depreciation: number | string;
  exp_representative: number | string;
  exp_donations: number | string;
  exp_other_deductible: number | string;
  exp_non_deductible: number | string;
}

export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, supabase } = await requireUser();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!company) notFound();

  // Default tax year = previous calendar year if past; current if not yet started
  const currentYear = new Date().getFullYear();
  const taxYear = currentYear - 1;
  const constants = getTaxConstants(taxYear);

  // Get-or-create the tax_year row
  let { data: row } = await supabase
    .from("company_tax_years")
    .select("*")
    .eq("company_id", id)
    .eq("year", taxYear)
    .maybeSingle();

  if (!row) {
    const { data: created } = await supabase
      .from("company_tax_years")
      .insert({ company_id: id, year: taxYear })
      .select()
      .single();
    row = created;
  }

  const r = (row ?? {
    year: taxYear,
    total_revenue: 0,
    exp_wages: 0,
    exp_operating: 0,
    exp_depreciation: 0,
    exp_representative: 0,
    exp_donations: 0,
    exp_other_deductible: 0,
    exp_non_deductible: 0,
  }) as CompanyTaxYearRow;

  const expenses: CorporateExpenseBreakdown = {
    wages: Number(r.exp_wages),
    operating: Number(r.exp_operating),
    depreciation: Number(r.exp_depreciation),
    representative: Number(r.exp_representative),
    donations: Number(r.exp_donations),
    other_deductible: Number(r.exp_other_deductible),
    non_deductible: Number(r.exp_non_deductible),
  };

  const result = calculateCorporateTax({
    total_revenue: Number(r.total_revenue),
    expenses,
    year: taxYear,
  });

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
      <header>
        <Link href="/companies" className="text-xs text-stone-500 hover:text-brand-700">
          ← Дружества
        </Link>
        <div className="mt-1 flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
            <p className="mt-1 text-sm text-stone-600">
              {company.bulstat ? `БУЛСТАТ ${company.bulstat} · ` : ""}
              {company.vat_registered ? `Регистрирано по ЗДДС${company.vat_number ? ` (${company.vat_number})` : ""}` : "Без регистрация по ЗДДС"}
            </p>
          </div>
          <div className="text-sm text-stone-500">Данъчна година: <strong>{taxYear}</strong> · {constants.currency}</div>
        </div>
      </header>

      {/* Top stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Stat label="Приходи" value={formatMoney(result.total_revenue, taxYear)} />
        <Stat label="Корп. данък (10%)" value={formatMoney(result.corporate_income_tax, taxYear)} />
        <Stat label="Данък върху представителни (10%)" value={formatMoney(result.representative_expense_tax, taxYear)} />
        <Stat label="Общо дължимо" value={formatMoney(result.total_tax_liability, taxYear)} highlight />
      </div>

      {/* Breakdown */}
      <div className="card">
        <h2 className="text-lg font-semibold">Разбивка</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <Row label="Приходи" value={formatMoney(result.total_revenue, taxYear)} />
          <Row label="− Общо разходи" value={`− ${formatMoney(result.total_expenses, taxYear)}`} />
          <Divider />
          <Row label="Счетоводна печалба" value={formatMoney(result.accounting_profit, taxYear)} bold />
          {result.donations_excess_added_back > 0 && (
            <>
              <Row
                label={`+ Дарения над ${formatMoney(result.donation_cap, taxYear)} (10% таван)`}
                value={`+ ${formatMoney(result.donations_excess_added_back, taxYear)}`}
              />
              <p className="ml-2 text-xs text-stone-500">
                Превишението над тавана се добавя обратно към данъчната основа.
              </p>
            </>
          )}
          {Number(r.exp_non_deductible) > 0 && (
            <Row
              label="+ Непризнати разходи"
              value={`+ ${formatMoney(Number(r.exp_non_deductible), taxYear)}`}
            />
          )}
          <Divider />
          <Row label="Данъчна основа" value={formatMoney(result.tax_base, taxYear)} bold />
          <Row label="Корпоративен данък (10%)" value={formatMoney(result.corporate_income_tax, taxYear)} bold />
          {result.representative_expense_tax > 0 && (
            <Row
              label="+ Данък върху представителни (чл. 204, 10%)"
              value={formatMoney(result.representative_expense_tax, taxYear)}
            />
          )}
          <Divider />
          <Row label="Общо дължимо" value={formatMoney(result.total_tax_liability, taxYear)} bold />
        </dl>

        {result.notes.length > 0 && (
          <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-stone-600">
            {result.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        )}
      </div>

      {/* Numbers form */}
      <div className="card">
        <h2 className="text-lg font-semibold">Финансови числа за {taxYear}</h2>
        <p className="mt-1 text-sm text-stone-600">
          Въведете годишните агрегати. Изчисленията се актуализират при запис.
        </p>
        <p className="mt-1 text-xs text-stone-500">Всички суми в {currencyLabel(taxYear)}</p>
        <CompanyNumbersForm
          companyId={id}
          year={taxYear}
          initial={{
            total_revenue: Number(r.total_revenue),
            exp_wages: Number(r.exp_wages),
            exp_operating: Number(r.exp_operating),
            exp_depreciation: Number(r.exp_depreciation),
            exp_representative: Number(r.exp_representative),
            exp_donations: Number(r.exp_donations),
            exp_other_deductible: Number(r.exp_other_deductible),
            exp_non_deductible: Number(r.exp_non_deductible),
          }}
        />
      </div>

      <p className="text-xs text-stone-500">
        Изчисленията покриват най-често срещаните корекции по Приложение 1 (таван на даренията 10%, чл. 204
        върху представителни, непризнати разходи). За пълни корекции — свързани лица, амортизационна разлика
        по САП, спогодби за избягване на двойно данъчно облагане — се консултирайте с правоспособен счетоводител.
      </p>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={"card " + (highlight ? "border-brand-300 bg-brand-50" : "")}>
      <div className="text-xs text-stone-500">{label}</div>
      <div className={"mt-1 text-2xl font-semibold tabular-nums " + (highlight ? "text-brand-900" : "")}>
        {value}
      </div>
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
