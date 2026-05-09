import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getTaxConstants } from "@easytax/tax-engine";
import { formatMoney, formatNumber } from "@/lib/format";

export default async function InvoicesPage() {
  const { user, supabase } = await requireUser();

  // Pick the year to display: most recent tax_years row, fallback to last year.
  const { data: taxYearRow } = await supabase
    .from("tax_years")
    .select("year")
    .eq("user_id", user.id)
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();
  const taxYear = taxYearRow?.year ?? new Date().getFullYear() - 1;
  const constants = getTaxConstants(taxYear);

  const { data: invoices = [] } = await supabase
    .from("invoices")
    .select("id, issue_date, client_name, amount_original, currency, amount_bgn, amount_eur, quarter, requires_review")
    .eq("user_id", user.id)
    .gte("issue_date", `${taxYear}-01-01`)
    .lte("issue_date", `${taxYear}-12-31`)
    .order("issue_date", { ascending: false });

  const filingAmount = (row: { amount_bgn: number | null; amount_eur: number | null }) =>
    Number(constants.currency === "EUR" ? row.amount_eur ?? 0 : row.amount_bgn ?? 0);

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Фактури — {taxYear}</h1>
          <p className="mt-1 text-sm text-stone-600">
            Подаване в {constants.currency === "EUR" ? "евро" : "лева"}.
          </p>
        </div>
        <Link href="/dashboard" className="btn-secondary">Назад към таблото</Link>
      </header>

      {invoices && invoices.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3">Клиент</th>
                <th className="px-4 py-3 text-right">Сума</th>
                <th className="px-4 py-3 text-right">Сума ({constants.currency})</th>
                <th className="px-4 py-3">Тримесечие</th>
                <th className="px-4 py-3">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td className="px-4 py-3 tabular-nums">{inv.issue_date}</td>
                  <td className="px-4 py-3">{inv.client_name ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(Number(inv.amount_original ?? 0))} {inv.currency}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatMoney(filingAmount(inv), taxYear)}
                  </td>
                  <td className="px-4 py-3">Q{inv.quarter ?? "—"}</td>
                  <td className="px-4 py-3">
                    {inv.requires_review ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        За преглед
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                        Потвърдена
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-sm text-stone-600">Няма добавени фактури.</p>
          <p className="mt-2 text-xs text-stone-500">
            Качването с AI извличане ще бъде добавено във Фаза 3.
          </p>
        </div>
      )}
    </div>
  );
}
