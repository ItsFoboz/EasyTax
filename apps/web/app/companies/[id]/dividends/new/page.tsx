import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DividendForm } from "./components/DividendForm";

export default async function NewDividendPage({
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

  return (
    <div className="space-y-6">
      <header>
        <Link
          href={`/companies/${id}/dividends`}
          className="text-xs text-stone-500 hover:text-brand-700"
        >
          ← Назад към дивиденти
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          Ново разпределение
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          За {company.name}. 5% данък при източника се изчислява автоматично.
        </p>
      </header>
      <div className="card max-w-xl">
        <DividendForm companyId={id} />
      </div>
    </div>
  );
}
