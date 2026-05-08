-- EasyTax — initial schema.
-- Generated for Supabase. Run via `supabase db push` or paste into SQL Editor.
-- All monetary amounts are BGN unless noted. EGN is stored encrypted at the
-- application layer (AES-256-GCM); this migration creates a `text` column —
-- the application is responsible for the cipher.

-- ─── extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── users (mirrors auth.users with app-level columns) ───────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  egn text,                  -- encrypted at application level (AES-256-GCM)
  birth_year integer,
  bulstat_number text,
  vat_registered boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── insurance_profiles ──────────────────────────────────────────────────────
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

-- ─── tax_years ───────────────────────────────────────────────────────────────
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
  snapshot jsonb,            -- full TaxResult at generation time
  created_at timestamptz not null default now(),
  unique (user_id, year)
);

-- ─── invoices ────────────────────────────────────────────────────────────────
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
  amount_bgn numeric not null,
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

-- ─── social_security_records ─────────────────────────────────────────────────
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

-- ─── tax_documents ───────────────────────────────────────────────────────────
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
