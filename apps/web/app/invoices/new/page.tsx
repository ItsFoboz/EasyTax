import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { InvoiceForm } from "./components/InvoiceForm";

export default async function NewInvoicePage() {
  await requireUser();
  return (
    <div className="space-y-6">
      <header>
        <Link href="/invoices" className="text-xs text-stone-500 hover:text-brand-700">
          ← Назад към фактури
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Нова фактура</h1>
        <p className="mt-1 text-sm text-stone-600">
          Въведете ръчно. Автоматично извличане от PDF/изображение ще бъде добавено по-късно.
        </p>
      </header>
      <div className="card max-w-2xl">
        <InvoiceForm />
      </div>
    </div>
  );
}
