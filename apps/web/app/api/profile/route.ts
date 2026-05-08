import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { InsuranceProfileType } from "@easytax/tax-engine";

interface OnboardingPayload {
  profile_type: InsuranceProfileType;
  full_name: string;
  egn: string;
  birth_year: number;
  bulstat_number?: string;
  vat_registered?: boolean;
  tax_year: number;
  // profile-specific
  eood_monthly_insurance_base?: number;
  employer_annual_insurable_income?: number;
  chosen_monthly_base?: number;
  health_insured_elsewhere?: boolean;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = (await req.json()) as OnboardingPayload;

  if (!body.profile_type || !body.full_name || !body.egn || !body.birth_year) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }
  if (!/^\d{10}$/.test(body.egn)) {
    return NextResponse.json({ error: "ЕГН трябва да е 10 цифри" }, { status: 400 });
  }

  // PHASE 6 will encrypt EGN via AES-256-GCM with an app-level key. For now we
  // store it as-is so the flow works end-to-end; surfaced as a TODO so this
  // is not forgotten before any production deploy.
  const egnToStore = body.egn; // TODO: encryptEgn(body.egn)

  // Upsert user row
  const { error: userError } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        email: user.email,
        full_name: body.full_name,
        egn: egnToStore,
        birth_year: body.birth_year,
        bulstat_number: body.bulstat_number ?? null,
        vat_registered: body.vat_registered ?? false,
      },
      { onConflict: "id" },
    );
  if (userError) return NextResponse.json({ error: userError.message }, { status: 500 });

  // Deactivate previous active profiles (single source of truth for "current").
  await supabase
    .from("insurance_profiles")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);

  const { error: profileError } = await supabase.from("insurance_profiles").insert({
    user_id: user.id,
    type: body.profile_type,
    birth_year: body.birth_year,
    health_insured_elsewhere: body.health_insured_elsewhere ?? false,
    eood_monthly_insurance_base: body.eood_monthly_insurance_base ?? null,
    employer_annual_insurable_income: body.employer_annual_insurable_income ?? null,
    chosen_monthly_base: body.chosen_monthly_base ?? null,
    is_active: true,
  });
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 });

  // Ensure a tax_years row exists for the chosen year.
  await supabase
    .from("tax_years")
    .upsert(
      { user_id: user.id, year: body.tax_year, status: "in_progress" },
      { onConflict: "user_id,year" },
    );

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("insurance_profiles")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
