# Supabase setup

## First-time setup

1. Create a Supabase project at https://app.supabase.com.
2. Project Settings → API: copy the **URL**, **anon key**, and **service role key**
   into `apps/web/.env.local` (see `apps/web/.env.example`).
3. Apply the migrations:

   **Option A — Supabase CLI** (recommended once you have it set up):
   ```bash
   supabase link --project-ref YOUR-PROJECT-REF
   supabase db push
   ```

   **Option B — SQL Editor**: paste each file from `supabase/migrations/` in
   order into the SQL Editor and run.

4. Authentication → Providers: ensure Email is enabled. For dev, you can
   disable email confirmation under Authentication → Providers → Email →
   "Confirm email" so accounts work immediately.

## What the migrations do

| File | Purpose |
|------|---------|
| `20250101000001_initial_schema.sql` | All app tables: users, insurance_profiles, tax_years, invoices, social_security_records, tax_documents |
| `20250101000002_rls_policies.sql` | Enables RLS on every table; locks every row to `auth.uid() = user_id` |

## Storage (Phase 3)

Phase 3 will add a private `invoices` bucket for source PDFs/images uploaded
to AI extraction. The bucket policy will be:

```sql
-- Phase 3 — not in this migration set yet
insert into storage.buckets (id, name, public) values ('invoices', 'invoices', false);
-- + RLS policies tying object ownership to auth.uid()
```
