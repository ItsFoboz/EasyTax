import { requireUser } from "@/lib/auth";
import { Wizard } from "./components/Wizard";

export default async function OnboardingPage() {
  const { user } = await requireUser();

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Настройка на профила</h1>
      <p className="mt-2 text-sm text-stone-600">
        Четири кратки стъпки. Всичко може да бъде променено по-късно.
      </p>
      <div className="mt-8">
        <Wizard userId={user.id} userEmail={user.email ?? ""} />
      </div>
    </main>
  );
}
