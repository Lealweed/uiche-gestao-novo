-- A2 - Compatibilidade de schema (Central Viagens)
-- Idempotente: pode rodar mais de uma vez sem quebrar.

create extension if not exists pgcrypto;

-- ===== Tabelas base =====
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  phone text,
  email text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operator_booths (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null,
  booth_id uuid not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(operator_id, booth_id)
);

create table if not exists public.time_punches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  booth_id uuid,
  shift_id uuid,
  punch_type text,
  note text,
  punched_at timestamptz not null default now()
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid,
  booth_id uuid,
  user_id uuid,
  movement_type text,
  amount numeric(12,2),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.shift_cash_closings (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid unique,
  booth_id uuid,
  user_id uuid,
  expected_cash numeric(12,2),
  declared_cash numeric(12,2),
  difference numeric(12,2),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.adjustment_requests (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid,
  requested_by uuid,
  reason text,
  status text not null default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,
  action text,
  entity text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ===== Colunas faltantes (drift) =====
alter table if exists public.companies add column if not exists commission_percent numeric(6,3);
alter table if exists public.companies add column if not exists active boolean not null default true;

-- legado: comission_percent -> commission_percent
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='companies' AND column_name='comission_percent'
  ) THEN
    EXECUTE 'update public.companies
             set commission_percent = coalesce(commission_percent, comission_percent)
             where commission_percent is null';
  END IF;
END $$;

alter table if exists public.shifts add column if not exists booth_id uuid;
alter table if exists public.shifts add column if not exists operator_id uuid;
alter table if exists public.shifts add column if not exists status text;
alter table if exists public.shifts add column if not exists opened_at timestamptz not null default now();
alter table if exists public.shifts add column if not exists closed_at timestamptz;

alter table if exists public.transactions add column if not exists booth_id uuid;
alter table if exists public.transactions add column if not exists operator_id uuid;
alter table if exists public.transactions add column if not exists company_id uuid;
alter table if exists public.transactions add column if not exists category_id uuid;
alter table if exists public.transactions add column if not exists subcategory_id uuid;
alter table if exists public.transactions add column if not exists sold_at timestamptz not null default now();
alter table if exists public.transactions add column if not exists status text not null default 'posted';
alter table if exists public.transactions add column if not exists payment_method text;
alter table if exists public.transactions add column if not exists commission_percent numeric(6,3);
alter table if exists public.transactions add column if not exists commission_amount numeric(12,2);

-- ===== Índices =====
create index if not exists idx_transactions_sold_at on public.transactions(sold_at);
create index if not exists idx_transactions_operator on public.transactions(operator_id);
create index if not exists idx_transactions_booth on public.transactions(booth_id);
create index if not exists idx_shifts_opened_at on public.shifts(opened_at);
create index if not exists idx_operator_booths_operator on public.operator_booths(operator_id);

-- ===== View usada pelo dashboard admin =====
create or replace view public.v_shift_totals as
select
  s.id as shift_id,
  coalesce(b.name, 'Sem guichê') as booth_name,
  coalesce(p.full_name, 'Sem operador') as operator_name,
  coalesce(s.status, 'open')::text as status,
  coalesce(sum(t.amount) filter (where t.status = 'posted'), 0)::numeric(12,2) as gross_amount,
  coalesce(sum(t.commission_amount) filter (where t.status = 'posted'), 0)::numeric(12,2) as commission_amount,
  coalesce(sum(t.amount) filter (where t.status = 'posted' and t.payment_method = 'pix'), 0)::numeric(12,2) as total_pix,
  coalesce(sum(t.amount) filter (where t.status = 'posted' and t.payment_method = 'credit'), 0)::numeric(12,2) as total_credit,
  coalesce(sum(t.amount) filter (where t.status = 'posted' and t.payment_method = 'debit'), 0)::numeric(12,2) as total_debit,
  coalesce(sum(t.amount) filter (where t.status = 'posted' and t.payment_method = 'cash'), 0)::numeric(12,2) as total_cash,
  0::int as missing_card_receipts,
  s.opened_at
from public.shifts s
left join public.booths b on b.id = s.booth_id
left join public.profiles p on p.user_id = s.operator_id
left join public.transactions t on t.shift_id = s.id
group by s.id, b.name, p.full_name, s.status, s.opened_at;

-- ===== RPCs esperadas no operador =====
create or replace function public.open_shift(p_booth_id uuid, p_ip text default null)
returns table (id uuid, booth_id uuid, status text)
language plpgsql
security definer
as $$
declare v_operator uuid;
begin
  v_operator := auth.uid();
  if v_operator is null then
    raise exception 'Usuário não autenticado';
  end if;

  insert into public.shifts (booth_id, operator_id, status, opened_at)
  values (p_booth_id, v_operator, 'open', now())
  returning shifts.id, shifts.booth_id, shifts.status into id, booth_id, status;

  return next;
end;
$$;

create or replace function public.close_shift(p_shift_id uuid, p_ip text default null, p_notes text default null)
returns void
language plpgsql
security definer
as $$
begin
  update public.shifts
     set status = 'closed',
         closed_at = now(),
         notes = coalesce(p_notes, notes)
   where id = p_shift_id;
end;
$$;

-- ===== Seeds mínimos (opcional, só quando vazio) =====
insert into public.transaction_categories(name, active)
select x.name, true
from (values ('Passagens'), ('Serviços'), ('Outros')) as x(name)
where not exists (select 1 from public.transaction_categories c where c.name = x.name);
