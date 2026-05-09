import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { NewCompanyForm } from "./components/NewCompanyForm";

export default async function NewCompanyPage() {
  await requireUser();
  return (
    <div className="space-y-6">
      <header>
        <Link href="/companies" className="text-xs text-stone-500 hover:text-brand-700">
          ← Назад към дружества
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Ново дружество</h1>
        <p className="mt-1 text-sm text-stone-600">
          Основни данни. Финансовите числа въвеждате в следващата стъпка.
        </p>
      </header>
      <div className="card max-w-xl">
        <NewCompanyForm />
      </div>
    </div>
  );
}
