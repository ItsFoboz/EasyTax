import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ companies: data });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const body = await req.json();
  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Името на дружеството е задължително." }, { status: 400 });
  }
  if (body.bulstat && !/^\d{9}(\d{4})?$/.test(body.bulstat)) {
    return NextResponse.json({ error: "БУЛСТАТ трябва да е 9 или 13 цифри." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("companies")
    .insert({
      owner_user_id: user.id,
      name: body.name.trim(),
      bulstat: body.bulstat ?? null,
      vat_number: body.vat_number ?? null,
      vat_registered: Boolean(body.vat_registered),
      fiscal_year_start: body.fiscal_year_start ?? "01-01",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ company: data });
}
