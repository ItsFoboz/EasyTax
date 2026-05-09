-- EasyTax — combined initial migration.
-- Paste this entire file into the Supabase SQL Editor in one go and click Run.
-- Equivalent to running 20250101000001_initial_schema.sql + 20250101000002_rls_policies.sql.

-- ═════════════════════════════════════════════════════════════════════════════
-- PART 1 — SCHEMA
-- ═════════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  egn text,
  birth_year integer,
  bulstat_number text,
  vat_registered boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.insurance_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in (
    'fully_self_employed',
    'eood_managing_director',
    'employed_primary',
    'civil_contract_only'
  )),
  birth_year integer,
  health_insured_elsewhere boolean not null default false,
  eood_monthly_insurance_base numeric,
  employer_annual_insurable_income numeric,
  chosen_monthly_base numeric,
  profile_valid_from date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists insurance_profiles_user_active_idx
  on public.insurance_profiles (user_id) where is_active = true;

create table if not exists public.tax_years (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  year integer not null,
  status text not null default 'in_progress' check (status in ('in_progress', 'ready', 'submitted')),
  total_gross_income numeric,
  total_normative_expenses numeric,
  total_social_security numeric,
  final_taxable_base numeric,
  income_tax_owed numeric,
  quarterly_advances_paid numeric not null default 0,
  final_tax_due numeric,
  vat_warning boolean not null default false,
  snapshot jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, year)
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tax_year_id uuid references public.tax_years(id) on delete set null,
  issue_date date not null,
  invoice_number text,
  client_name text,
  client_country text,
  amount_original numeric,
  currency text not null default 'BGN',
  exchange_rate numeric not null default 1,
  amount_bgn numeric,
  amount_eur numeric,
  bnb_rate_date date,
  service_description text,
  is_b2b boolean,
  is_eu_client boolean,
  extracted_by text not null default 'manual' check (extracted_by in ('manual', 'ai')),
  ai_confidence jsonb,
  requires_review boolean not null default false,
  source_file_url text,
  quarter integer check (quarter between 1 and 4),
  created_at timestamptz not null default now()
);

create index if not exists invoices_user_year_idx
  on public.invoices (user_id, issue_date);

create table if not exists public.social_security_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  base_income numeric,
  pension_contribution numeric,
  health_contribution numeric,
  maternity_contribution numeric,
  upf_contribution numeric,
  total_paid numeric,
  form1_status text not null default 'pending' check (form1_status in ('pending', 'filed')),
  created_at timestamptz not null default now(),
  unique (user_id, year, month)
);

create table if not exists public.tax_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  tax_year_id uuid references public.tax_years(id) on delete set null,
  type text check (type in ('declaration_50', 'form_1', 'form_6', 'annex_3')),
  generated_at timestamptz,
  file_url text,
  xml_url text,
  status text not null default 'draft' check (status in ('draft', 'final'))
);

-- ═════════════════════════════════════════════════════════════════════════════
-- PART 2 — ROW LEVEL SECURITY
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.users enable row level security;
alter table public.insurance_profiles enable row level security;
alter table public.tax_years enable row level security;
alter table public.invoices enable row level security;
alter table public.social_security_records enable row level security;
alter table public.tax_documents enable row level security;

-- users
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users_delete_own" on public.users
  for delete using (auth.uid() = id);

-- insurance_profiles
create policy "ip_select_own" on public.insurance_profiles
  for select using (auth.uid() = user_id);
create policy "ip_insert_own" on public.insurance_profiles
  for insert with check (auth.uid() = user_id);
create policy "ip_update_own" on public.insurance_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ip_delete_own" on public.insurance_profiles
  for delete using (auth.uid() = user_id);

-- tax_years
create policy "ty_select_own" on public.tax_years
  for select using (auth.uid() = user_id);
create policy "ty_insert_own" on public.tax_years
  for insert with check (auth.uid() = user_id);
create policy "ty_update_own" on public.tax_years
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ty_delete_own" on public.tax_years
  for delete using (auth.uid() = user_id);

-- invoices
create policy "inv_select_own" on public.invoices
  for select using (auth.uid() = user_id);
create policy "inv_insert_own" on public.invoices
  for insert with check (auth.uid() = user_id);
create policy "inv_update_own" on public.invoices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "inv_delete_own" on public.invoices
  for delete using (auth.uid() = user_id);

-- social_security_records
create policy "ssr_select_own" on public.social_security_records
  for select using (auth.uid() = user_id);
create policy "ssr_insert_own" on public.social_security_records
  for insert with check (auth.uid() = user_id);
create policy "ssr_update_own" on public.social_security_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ssr_delete_own" on public.social_security_records
  for delete using (auth.uid() = user_id);

-- tax_documents
create policy "td_select_own" on public.tax_documents
  for select using (auth.uid() = user_id);
create policy "td_insert_own" on public.tax_documents
  for insert with check (auth.uid() = user_id);
create policy "td_update_own" on public.tax_documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "td_delete_own" on public.tax_documents
  for delete using (auth.uid() = user_id);
