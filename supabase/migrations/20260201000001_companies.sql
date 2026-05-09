-- Corporate filing entities: ЕООД, ООД, АД owned by users.
-- A single user can own 0..N companies in addition to their personal filing.

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  bulstat text,
  vat_number text,
  vat_registered boolean not null default false,
  fiscal_year_start text not null default '01-01', -- MM-DD; v1 only supports 01-01
  created_at timestamptz not null default now()
);

create index if not exists companies_owner_idx
  on public.companies (owner_user_id);

-- Annual revenue + expense aggregates per company per year.
-- v1: user enters totals (or category subtotals); we don't track individual receipts.
create table if not exists public.company_tax_years (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  year integer not null,

  total_revenue numeric not null default 0,

  -- Expense categories (see corporate-tax-engine types)
  exp_wages numeric not null default 0,
  exp_operating numeric not null default 0,
  exp_depreciation numeric not null default 0,
  exp_representative numeric not null default 0,
  exp_donations numeric not null default 0,
  exp_other_deductible numeric not null default 0,
  exp_non_deductible numeric not null default 0,

  -- Snapshot of full corporate tax result at last calculation
  snapshot jsonb,
  status text not null default 'in_progress' check (status in ('in_progress', 'ready', 'submitted')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, year)
);

-- Dividend distributions from company to recipients (5% withholding tax + чл. 142 declaration)
create table if not exists public.company_dividends (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  year integer not null,
  distribution_date date,
  recipient_user_id uuid references public.users(id) on delete set null,
  recipient_name text,
  recipient_egn text,                  -- encrypted at app level (Phase 6)
  amount_bgn numeric,                  -- for distributions before 2026
  amount_eur numeric,                  -- for distributions in 2026+
  withholding_paid boolean not null default false,
  declaration_142_filed boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.companies enable row level security;
alter table public.company_tax_years enable row level security;
alter table public.company_dividends enable row level security;

create policy "co_select_own" on public.companies
  for select using (auth.uid() = owner_user_id);
create policy "co_insert_own" on public.companies
  for insert with check (auth.uid() = owner_user_id);
create policy "co_update_own" on public.companies
  for update using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
create policy "co_delete_own" on public.companies
  for delete using (auth.uid() = owner_user_id);

-- company_tax_years: indirect ownership through companies.owner_user_id
create policy "cty_select_own" on public.company_tax_years
  for select using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_user_id = auth.uid())
  );
create policy "cty_insert_own" on public.company_tax_years
  for insert with check (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_user_id = auth.uid())
  );
create policy "cty_update_own" on public.company_tax_years
  for update using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_user_id = auth.uid())
  );
create policy "cty_delete_own" on public.company_tax_years
  for delete using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_user_id = auth.uid())
  );

create policy "div_select_own" on public.company_dividends
  for select using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_user_id = auth.uid())
  );
create policy "div_insert_own" on public.company_dividends
  for insert with check (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_user_id = auth.uid())
  );
create policy "div_update_own" on public.company_dividends
  for update using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_user_id = auth.uid())
  ) with check (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_user_id = auth.uid())
  );
create policy "div_delete_own" on public.company_dividends
  for delete using (
    exists (select 1 from public.companies c where c.id = company_id and c.owner_user_id = auth.uid())
  );
