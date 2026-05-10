"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteDividendButton({ companyId, divId }: { companyId: string; divId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    if (pending) return;
    if (!confirm("Изтрий това разпределение? Действието е необратимо.")) return;
    setPending(true);
    const res = await fetch(`/api/companies/${companyId}/dividends/${divId}`, {
      method: "DELETE",
    });
    setPending(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Грешка при изтриване.");
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-xs text-stone-500 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? "…" : "Изтрий"}
    </button>
  );
}
