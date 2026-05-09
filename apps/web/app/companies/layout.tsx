import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { SignOutButton } from "../dashboard/components/SignOutButton";

export default async function CompaniesLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireUser();
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="font-semibold text-brand-700">ДанъкЛесно</Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="text-stone-700 hover:text-brand-700">Лично</Link>
            <Link href="/invoices" className="text-stone-700 hover:text-brand-700">Фактури</Link>
            <Link href="/companies" className="font-medium text-brand-700">Дружества</Link>
            <span className="text-stone-300">|</span>
            <span className="text-xs text-stone-500">{user.email}</span>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
