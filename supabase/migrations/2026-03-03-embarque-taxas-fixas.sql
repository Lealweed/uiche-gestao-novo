-- Taxas de embarque fixas por transação (Belém/Goiânia)
-- Incremental e compatível com dados existentes.

alter table if exists public.transactions
  add column if not exists boarding_fee_city text,
  add column if not exists boarding_fee_amount numeric(12,2) not null default 0;

alter table if exists public.transactions
  drop constraint if exists transactions_boarding_fee_city_check;

alter table if exists public.transactions
  add constraint transactions_boarding_fee_city_check
  check (boarding_fee_city is null or boarding_fee_city in ('belem', 'goiania'));

alter table if exists public.transactions
  drop constraint if exists transactions_boarding_fee_amount_check;

alter table if exists public.transactions
  add constraint transactions_boarding_fee_amount_check
  check (boarding_fee_amount >= 0);

create index if not exists transactions_boarding_fee_city_idx
  on public.transactions(boarding_fee_city);
