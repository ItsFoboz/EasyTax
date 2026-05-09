-- Bulgaria adopted the euro on 2026-01-01 at the fixed parity 1 EUR = 1.95583 BGN.
-- Add a euro-denominated amount column alongside amount_bgn so historical
-- BGN-era invoices (2024-2025) and EUR-era invoices (2026+) can coexist.
--
-- Run this AFTER the initial schema migration. Apply via Supabase SQL Editor:
-- Dashboard → SQL Editor → New query → paste → Run.

alter table public.invoices
  add column if not exists amount_eur numeric;

-- Index for queries filtering on EUR-era invoices
create index if not exists invoices_user_year_eur_idx
  on public.invoices (user_id, issue_date)
  where amount_eur is not null;
