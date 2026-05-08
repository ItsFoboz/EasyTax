-- Row Level Security: every table is locked to auth.uid() = user_id.
-- The id column on public.users IS the user_id (it mirrors auth.users.id),
-- so the policy on that table compares against id directly.

alter table public.users enable row level security;
alter table public.insurance_profiles enable row level security;
alter table public.tax_years enable row level security;
alter table public.invoices enable row level security;
alter table public.social_security_records enable row level security;
alter table public.tax_documents enable row level security;

-- ─── users ───────────────────────────────────────────────────────────────────
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_insert_own" on public.users
  for insert with check (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "users_delete_own" on public.users
  for delete using (auth.uid() = id);

-- ─── insurance_profiles ──────────────────────────────────────────────────────
create policy "ip_select_own" on public.insurance_profiles
  for select using (auth.uid() = user_id);
create policy "ip_insert_own" on public.insurance_profiles
  for insert with check (auth.uid() = user_id);
create policy "ip_update_own" on public.insurance_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ip_delete_own" on public.insurance_profiles
  for delete using (auth.uid() = user_id);

-- ─── tax_years ───────────────────────────────────────────────────────────────
create policy "ty_select_own" on public.tax_years
  for select using (auth.uid() = user_id);
create policy "ty_insert_own" on public.tax_years
  for insert with check (auth.uid() = user_id);
create policy "ty_update_own" on public.tax_years
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ty_delete_own" on public.tax_years
  for delete using (auth.uid() = user_id);

-- ─── invoices ────────────────────────────────────────────────────────────────
create policy "inv_select_own" on public.invoices
  for select using (auth.uid() = user_id);
create policy "inv_insert_own" on public.invoices
  for insert with check (auth.uid() = user_id);
create policy "inv_update_own" on public.invoices
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "inv_delete_own" on public.invoices
  for delete using (auth.uid() = user_id);

-- ─── social_security_records ─────────────────────────────────────────────────
create policy "ssr_select_own" on public.social_security_records
  for select using (auth.uid() = user_id);
create policy "ssr_insert_own" on public.social_security_records
  for insert with check (auth.uid() = user_id);
create policy "ssr_update_own" on public.social_security_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ssr_delete_own" on public.social_security_records
  for delete using (auth.uid() = user_id);

-- ─── tax_documents ───────────────────────────────────────────────────────────
create policy "td_select_own" on public.tax_documents
  for select using (auth.uid() = user_id);
create policy "td_insert_own" on public.tax_documents
  for insert with check (auth.uid() = user_id);
create policy "td_update_own" on public.tax_documents
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "td_delete_own" on public.tax_documents
  for delete using (auth.uid() = user_id);
