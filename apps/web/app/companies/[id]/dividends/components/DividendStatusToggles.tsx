"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DividendStatusToggles({
  companyId,
  divId,
  withholdingPaid,
  declaration142Filed,
}: {
  companyId: string;
  divId: string;
  withholdingPaid: boolean;
  declaration142Filed: boolean;
}) {
  const router = useRouter();
  const [paid, setPaid] = useState(withholdingPaid);
  const [filed, setFiled] = useState(declaration142Filed);
  const [, startTransition] = useTransition();

  async function patch(update: { withholding_paid?: boolean; declaration_142_filed?: boolean }) {
    const res = await fetch(`/api/companies/${companyId}/dividends/${divId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? "Грешка при запис.");
      // roll back
      setPaid(withholdingPaid);
      setFiled(declaration142Filed);
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-4">
      <label className="flex items-center gap-1.5 text-xs text-stone-700">
        <input
          type="checkbox"
          checked={paid}
          onChange={(e) => {
            setPaid(e.target.checked);
            patch({ withholding_paid: e.target.checked });
          }}
        />
        Платен
      </label>
      <label className="flex items-center gap-1.5 text-xs text-stone-700">
        <input
          type="checkbox"
          checked={filed}
          onChange={(e) => {
            setFiled(e.target.checked);
            patch({ declaration_142_filed: e.target.checked });
          }}
        />
        Чл. 142 подадена
      </label>
    </div>
  );
}
