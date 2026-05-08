import Link from "next/link";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-6 py-3">
          <Link href="/" className="font-semibold text-brand-700">ДанъкЛесно</Link>
          <span className="text-xs text-stone-500">Настройка</span>
        </div>
      </header>
      {children}
    </div>
  );
}
