import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getTaxConstants } from "@easytax/tax-engine";
import { formatMoney, formatNumber } from "@/lib/format";
import { DeleteInvoiceButton } from "./components/DeleteInvoiceButton";

export default async function InvoicesPage() {
  const { user, supabase } = await requireUser();

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
    .select("id, issue_date, invoice_number, client_name, amount_original, currency, amount_bgn, amount_eur, quarter, requires_review")
    .eq("user_id", user.id)
    .gte("issue_date", `${taxYear}-01-01`)
    .lte("issue_date", `${taxYear}-12-31`)
    .order("issue_date", { ascending: false });

  const filingAmount = (row: { amount_bgn: number | null; amount_eur: number | null }) =>
    Number(constants.currency === "EUR" ? row.amount_eur ?? 0 : row.amount_bgn ?? 0);

  const total = (invoices ?? []).reduce((sum, inv) => sum + filingAmount(inv), 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Фактури — {taxYear}</h1>
          <p className="mt-1 text-sm text-stone-600">
            Подаване в {constants.currency === "EUR" ? "евро" : "лева"}.
            {invoices && invoices.length > 0 && (
              <>
                {" "}Сума: <strong>{formatMoney(total, taxYear)}</strong>
              </>
            )}
          </p>
        </div>
        <Link href="/invoices/new" className="btn-primary">Добави фактура</Link>
      </header>

      {invoices && invoices.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">№</th>
                <th className="px-4 py-3 font-medium">Клиент</th>
                <th className="px-4 py-3 text-right font-medium">Сума</th>
                <th className="px-4 py-3 text-right font-medium">{constants.currency}</th>
                <th className="px-4 py-3 font-medium">Q</th>
                <th className="px-4 py-3 font-medium">Статус</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-stone-50/40">
                  <td className="px-4 py-3 tabular-nums">{inv.issue_date}</td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-500">{inv.invoice_number ?? "—"}</td>
                  <td className="px-4 py-3">{inv.client_name ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatNumber(Number(inv.amount_original ?? 0))} {inv.currency}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatMoney(filingAmount(inv), taxYear)}
                  </td>
                  <td className="px-4 py-3 text-stone-500">Q{inv.quarter ?? "—"}</td>
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
                  <td className="px-4 py-3 text-right">
                    <DeleteInvoiceButton
                      id={inv.id}
                      label={inv.invoice_number ?? inv.client_name ?? inv.issue_date}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card mx-auto max-w-xl text-center">
          <h2 className="text-base font-semibold text-stone-900">
            Все още няма фактури за {taxYear} г.
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Добавете ги ръчно — само няколко полета на фактура. Автоматичното извличане от PDF/изображение ще бъде добавено по-късно.
          </p>
          <Link href="/invoices/new" className="btn-primary mt-6 inline-flex">
            Добави първата си фактура
          </Link>
        </div>
      )}
    </div>
  );
}
