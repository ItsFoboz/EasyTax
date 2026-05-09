import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function CompaniesIndexPage() {
  const { user, supabase } = await requireUser();
  const { data: companies = [] } = await supabase
    .from("companies")
    .select("id, name, bulstat, vat_registered, created_at")
    .eq("owner_user_id", user.id)
    .order("created_at");

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Дружества</h1>
          <p className="mt-1 text-sm text-stone-600">
            ЕООД / ООД / АД, за които подавате корпоративен данък (ЗКПО, чл. 92).
          </p>
        </div>
        <Link href="/companies/new" className="btn-primary">+ Добави дружество</Link>
      </header>

      {companies && companies.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {companies.map((c) => (
            <Link
              key={c.id}
              href={`/companies/${c.id}`}
              className="card transition hover:border-brand-300"
            >
              <div className="font-semibold text-stone-900">{c.name}</div>
              <div className="mt-1 text-xs text-stone-500">
                {c.bulstat ? `БУЛСТАТ ${c.bulstat}` : "Без БУЛСТАТ"} ·{" "}
                {c.vat_registered ? "Регистрирано по ЗДДС" : "Не е регистрирано по ЗДДС"}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card text-center">
          <p className="text-sm text-stone-600">Все още няма добавени дружества.</p>
          <Link href="/companies/new" className="btn-primary mt-4 inline-flex">
            Добави първото си дружество
          </Link>
        </div>
      )}

      <p className="text-xs text-stone-500">
        Корпоративният данък (10% върху облагаемата печалба) се изчислява отделно от личния ви доход.
        Дивидентите, които си разпределяте, са с допълнителен 5% данък при източника (декларация по чл. 142).
      </p>
    </div>
  );
}
