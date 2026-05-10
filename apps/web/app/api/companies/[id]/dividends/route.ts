import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTaxConstants } from "@easytax/tax-engine";

interface DividendBody {
  distribution_date: string;
  recipient_name?: string;
  recipient_egn?: string;
  amount_filing: number;
  withholding_paid?: boolean;
  declaration_142_filed?: boolean;
}

async function checkOwnership(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>, userId: string, companyId: string) {
  const { data } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("owner_user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  if (!(await checkOwnership(supabase, user.id, id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("company_dividends")
    .select("*")
    .eq("company_id", id)
    .order("distribution_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dividends: data });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  if (!(await checkOwnership(supabase, user.id, id))) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = (await req.json()) as DividendBody;
  if (!body.distribution_date || !body.amount_filing) {
    return NextResponse.json({ error: "distribution_date and amount_filing are required" }, { status: 400 });
  }
  if (!Number.isFinite(body.amount_filing) || body.amount_filing <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 });
  }
  if (body.recipient_egn && !/^\d{10}$/.test(body.recipient_egn)) {
    return NextResponse.json({ error: "ЕГН трябва да е 10 цифри" }, { status: 400 });
  }

  const distYear = Number.parseInt(body.distribution_date.slice(0, 4), 10);
  let constants;
  try {
    constants = getTaxConstants(distYear);
  } catch {
    return NextResponse.json(
      { error: `Tax year ${distYear} is not configured.` },
      { status: 400 },
    );
  }
  const isEur = constants.currency === "EUR";

  // PHASE 6 will encrypt recipient_egn via AES-256-GCM. For now stored as-is.
  const { data, error } = await supabase
    .from("company_dividends")
    .insert({
      company_id: id,
      year: distYear,
      distribution_date: body.distribution_date,
      recipient_name: body.recipient_name?.trim() || null,
      recipient_egn: body.recipient_egn || null,
      amount_bgn: isEur ? null : body.amount_filing,
      amount_eur: isEur ? body.amount_filing : null,
      withholding_paid: body.withholding_paid ?? false,
      declaration_142_filed: body.declaration_142_filed ?? false,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dividend: data });
}
