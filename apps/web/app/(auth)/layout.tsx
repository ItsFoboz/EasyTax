import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
      <Link href="/" className="mb-8 text-lg font-semibold text-brand-700">
        ДанъкЛесно
      </Link>
      <div className="w-full">{children}</div>
    </main>
  );
}
