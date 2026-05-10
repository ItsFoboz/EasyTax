import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  calculateDividendWithholding,
  DIVIDEND_WITHHOLDING_RATE,
} from "@easytax/corporate-tax-engine";
import { getTaxConstants } from "@easytax/tax-engine";
import { formatMoney, formatPercent } from "@/lib/format";
import { DividendStatusToggles } from "./components/DividendStatusToggles";
import { DeleteDividendButton } from "./components/DeleteDividendButton";

export default async function DividendsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, supabase } = await requireUser();

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!company) notFound();

  const { data: dividends = [] } = await supabase
    .from("company_dividends")
    .select("id, distribution_date, year, recipient_name, amount_bgn, amount_eur, withholding_paid, declaration_142_filed")
    .eq("company_id", id)
    .order("distribution_date", { ascending: false });

  const rows = (dividends ?? []).map((d) => {
    const c = (() => { try { return getTaxConstants(d.year); } catch { return null; } })();
    const filingAmount = Number(c?.currency === "EUR" ? d.amount_eur ?? 0 : d.amount_bgn ?? 0);
    const calc = calculateDividendWithholding(filingAmount);
    return { ...d, currency: c?.currency ?? "EUR", filingAmount, calc };
  });

  // Year totals
  const totalsByYear = new Map<number, { gross: number; withholding: number; net: number; currency: "BGN" | "EUR" }>();
  for (const r of rows) {
    const t = totalsByYear.get(r.year) ?? { gross: 0, withholding: 0, net: 0, currency: r.currency as "BGN" | "EUR" };
    t.gross += r.filingAmount;
    t.withholding += r.calc.withholding;
    t.net += r.calc.net;
    totalsByYear.set(r.year, t);
  }
  const totals = Array.from(totalsByYear.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, t]) => ({ year, ...t }));

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/companies/${id}`}
          className="text-xs text-stone-500 hover:text-brand-700"
        >
          ← {company.name}
        </Link>
        <div className="mt-1 flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Дивиденти</h1>
          <Link href={`/companies/${id}/dividends/new`} className="btn-primary">
            Добави разпределение
          </Link>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          Разпределенията към физически лица са с {formatPercent(DIVIDEND_WITHHOLDING_RATE * 100)} данък при източника.
          Декларира се с Декларация по чл. 142 ЗДДФЛ — до края на месеца, следващ тримесечието на разпределението.
        </p>
      </header>

      {totals.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {totals.map((t) => (
            <div key={t.year} className="card">
              <div className="text-xs text-stone-500">Година {t.year} · {t.currency}</div>
              <div className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-600">Брутно разпределено</span>
                  <span className="tabular-nums font-medium">{formatMoney(t.gross, t.year)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-600">Удържан данък (5%)</span>
                  <span className="tabular-nums font-medium text-brand-700">{formatMoney(t.withholding, t.year)}</span>
                </div>
                <div className="flex justify-between border-t border-stone-100 pt-1.5">
                  <span className="text-stone-600">Нетно към получателя</span>
                  <span className="tabular-nums font-medium">{formatMoney(t.net, t.year)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 ? (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left text-xs text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Дата</th>
                <th className="px-4 py-3 font-medium">Получател</th>
                <th className="px-4 py-3 text-right font-medium">Брутно</th>
                <th className="px-4 py-3 text-right font-medium">Удържан 5%</th>
                <th className="px-4 py-3 text-right font-medium">Нетно</th>
                <th className="px-4 py-3 font-medium">Платен</th>
                <th className="px-4 py-3 font-medium">Чл. 142</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-stone-50/40">
                  <td className="px-4 py-3 tabular-nums">{r.distribution_date}</td>
                  <td className="px-4 py-3">{r.recipient_name ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(r.calc.gross, r.year)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-brand-700">
                    {formatMoney(r.calc.withholding, r.year)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(r.calc.net, r.year)}</td>
                  <td className="px-4 py-3" colSpan={2}>
                    <DividendStatusToggles
                      companyId={id}
                      divId={r.id}
                      withholdingPaid={r.withholding_paid}
                      declaration142Filed={r.declaration_142_filed}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteDividendButton companyId={id} divId={r.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card mx-auto max-w-xl text-center">
          <h2 className="text-base font-semibold text-stone-900">
            Все още няма разпределени дивиденти
          </h2>
          <p className="mt-2 text-sm text-stone-600">
            Разпределенията се правят от облагаемата печалба след корпоративен данък.
            Към физически лица се удържа 5% данък при източника.
          </p>
          <Link
            href={`/companies/${id}/dividends/new`}
            className="btn-primary mt-6 inline-flex"
          >
            Добави първото разпределение
          </Link>
        </div>
      )}

      <p className="text-xs text-stone-500">
        Забележка: при получатели от ЕС/ЕИП по силата на спогодби за избягване на двойно данъчно
        облагане може да се прилага намалена ставка или освобождаване. Тази версия не моделира
        тези случаи — консултирайте се със счетоводител.
      </p>
    </div>
  );
}
