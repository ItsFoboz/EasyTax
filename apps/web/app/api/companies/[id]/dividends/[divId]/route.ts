import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; divId: string }> },
) {
  const { id, divId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Confirm ownership of the parent company before deleting.
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { error, count } = await supabase
    .from("company_dividends")
    .delete({ count: "exact" })
    .eq("id", divId)
    .eq("company_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!count) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; divId: string }> },
) {
  const { id, divId } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", id)
    .eq("owner_user_id", user.id)
    .maybeSingle();
  if (!company) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json();
  const update: Record<string, unknown> = {};
  if (typeof body.withholding_paid === "boolean") update.withholding_paid = body.withholding_paid;
  if (typeof body.declaration_142_filed === "boolean") update.declaration_142_filed = body.declaration_142_filed;
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("company_dividends")
    .update(update)
    .eq("id", divId)
    .eq("company_id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ dividend: data });
}
