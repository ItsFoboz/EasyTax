import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { quarterFromIsoDate, getTaxConstants } from "@easytax/tax-engine";

/**
 * Manual invoice CRUD. AI extraction lands in Phase 3 and will POST to
 * /api/invoices/upload, then redirect to a review screen before writing here.
 *
 * Currency handling: the request body carries a single `amount_filing`
 * (the amount in the *tax year's* filing currency, already converted from
 * any foreign currency at the BNB rate locked at extraction time). The
 * route writes it to the appropriate column — `amount_bgn` for 2024-2025,
 * `amount_eur` for 2026+. The other column stays NULL.
 *
 * Back-compat: if a request body still uses the old `amount_bgn` field,
 * we accept it as the filing amount.
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
  const filingAmount = Number(body.amount_filing ?? body.amount_bgn ?? body.amount_eur);
  if (!body.issue_date || !Number.isFinite(filingAmount) || filingAmount <= 0) {
    return NextResponse.json(
      { error: "issue_date and a positive amount in the filing currency are required" },
      { status: 400 },
    );
  }

  const issueYear = Number.parseInt(body.issue_date.slice(0, 4), 10);
  let constants;
  try {
    constants = getTaxConstants(issueYear);
  } catch {
    return NextResponse.json(
      { error: `Tax year ${issueYear} is not configured. Add a constants file before posting invoices.` },
      { status: 400 },
    );
  }

  const quarter = quarterFromIsoDate(body.issue_date);
  const isEur = constants.currency === "EUR";

  const { data, error } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      issue_date: body.issue_date,
      invoice_number: body.invoice_number ?? null,
      client_name: body.client_name ?? null,
      client_country: body.client_country ?? null,
      amount_original: body.amount_original ?? filingAmount,
      currency: body.currency ?? constants.currency,
      exchange_rate: body.exchange_rate ?? 1,
      amount_bgn: isEur ? null : filingAmount,
      amount_eur: isEur ? filingAmount : null,
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
