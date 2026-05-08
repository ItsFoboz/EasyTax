"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/onboarding` : undefined,
      },
    });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is disabled, redirect to onboarding immediately.
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="card">
      <h1 className="text-xl font-semibold">Регистрация</h1>
      <p className="mt-1 text-sm text-stone-600">Създайте профил за управление на данъците ви.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="label">Имейл</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="input"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password" className="label">Парола</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="input"
            autoComplete="new-password"
          />
          <p className="help">Минимум 8 символа.</p>
        </div>
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={pending} className="btn-primary w-full">
          {pending ? "Създаване…" : "Създай профил"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-600">
        Имате профил?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Вход
        </Link>
      </p>
    </div>
  );
}
