import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  calculateTax,
  type Invoice,
  type InsuranceProfile,
} from "@easytax/tax-engine";

export async function GET(_req: Request, { params }: { params: Promise<{ year: string }> }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { year: yearStr } = await params;
  const year = Number.parseInt(yearStr, 10);
  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: "invalid year" }, { status: 400 });
  }

  const [profileRes, userRes, invoiceRes] = await Promise.all([
    supabase
      .from("insurance_profiles")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle(),
    supabase.from("users").select("birth_year").eq("id", user.id).maybeSingle(),
    supabase
      .from("invoices")
      .select("issue_date, amount_original, currency, exchange_rate, amount_bgn")
      .eq("user_id", user.id)
      .gte("issue_date", `${year}-01-01`)
      .lte("issue_date", `${year}-12-31`),
  ]);

  if (!profileRes.data) {
    return NextResponse.json({ error: "no active profile" }, { status: 400 });
  }

  const profile: InsuranceProfile = {
    type: profileRes.data.type,
    birth_year: userRes.data?.birth_year ?? new Date().getFullYear() - 30,
    health_insured_elsewhere: profileRes.data.health_insured_elsewhere ?? false,
    eood_monthly_insurance_base: profileRes.data.eood_monthly_insurance_base ?? undefined,
    employer_annual_insurable_income:
      profileRes.data.employer_annual_insurable_income ?? undefined,
    chosen_monthly_base: profileRes.data.chosen_monthly_base ?? undefined,
  };

  const invoices: Invoice[] = (invoiceRes.data ?? []).map((r) => ({
    issue_date: r.issue_date,
    amount_original: Number(r.amount_original),
    currency: r.currency,
    exchange_rate: Number(r.exchange_rate),
    amount_bgn: Number(r.amount_bgn),
  }));

  const result = calculateTax(invoices, profile, year);
  return NextResponse.json(result);
}
