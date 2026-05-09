import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const NUMERIC_KEYS = [
  "total_revenue",
  "exp_wages",
  "exp_operating",
  "exp_depreciation",
  "exp_representative",
  "exp_donations",
  "exp_other_deductible",
  "exp_non_deductible",
] as const;

type NumericKey = (typeof NUMERIC_KEYS)[number];

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Confirm ownership before mutating.
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });

  const url = new URL(req.url);
  const yearParam = url.searchParams.get("year");
  const year = yearParam ? Number.parseInt(yearParam, 10) : NaN;
  if (!Number.isInteger(year)) {
    return NextResponse.json({ error: "year query param required" }, { status: 400 });
  }

  const body = await req.json();
  const update: Partial<Record<NumericKey, number>> = {};
  for (const key of NUMERIC_KEYS) {
    const raw = body[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) {
      return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
    }
    update[key] = num;
  }

  const { data, error } = await supabase
    .from("company_tax_years")
    .upsert(
      { company_id: id, year, ...update, updated_at: new Date().toISOString() },
      { onConflict: "company_id,year" },
    )
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tax_year: data });
}
