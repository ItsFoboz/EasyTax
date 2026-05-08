import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Existing user → check if they've onboarded
    const { data: profile } = await supabase
      .from("insurance_profiles")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    redirect(profile ? "/dashboard" : "/onboarding");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl text-center">
        <p className="mb-3 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          За свободни професии в България
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
          ДанъкЛесно
        </h1>
        <p className="mt-4 text-lg text-stone-600">
          Изчислява данъка ви, следи осигуровките, генерира декларация по чл. 50 за подаване в НАП.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/register" className="btn-primary">
            Започнете безплатно
          </Link>
          <Link href="/login" className="btn-secondary">
            Вход
          </Link>
        </div>
        <p className="mt-12 text-xs text-stone-500">
          Изчисленията се основават на стандартното 25% нормативно признати разходи. Не представляват
          данъчен съвет — за сложни случаи се консултирайте със счетоводител.
        </p>
      </div>
    </main>
  );
}
