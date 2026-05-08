import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { quarterFromIsoDate } from "@easytax/tax-engine";

/**
 * Manual invoice CRUD. AI extraction lands in Phase 3 and will POST to
 * /api/invoices/upload, then redirect to a review screen before writing here.
 */

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const url = new URL(req.url);
  const yearParam = url.searchParams.get("year");
  let q = supabase.from("invoices").select("*").eq("user_id", user.id).order("issue_date");
  if (yearParam) {
    q = q.gte("issue_date", `${yearParam}-01-01`).lte("issue_date", `${yearParam}-12-31`);
  }
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoices: data });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json();
  if (!body.issue_date || !body.amount_bgn) {
    return NextResponse.json({ error: "issue_date and amount_bgn are required" }, { status: 400 });
  }

  const quarter = quarterFromIsoDate(body.issue_date);

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      issue_date: body.issue_date,
      invoice_number: body.invoice_number ?? null,
      client_name: body.client_name ?? null,
      client_country: body.client_country ?? null,
      amount_original: body.amount_original ?? body.amount_bgn,
      currency: body.currency ?? "BGN",
      exchange_rate: body.exchange_rate ?? 1,
      amount_bgn: body.amount_bgn,
      bnb_rate_date: body.bnb_rate_date ?? body.issue_date,
      service_description: body.service_description ?? null,
      is_b2b: body.is_b2b ?? null,
      is_eu_client: body.is_eu_client ?? null,
      extracted_by: body.extracted_by ?? "manual",
      requires_review: body.requires_review ?? false,
      quarter,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoice: data });
}
