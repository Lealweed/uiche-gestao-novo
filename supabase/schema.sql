-- Guichê Gestão - Schema inicial
-- PostgreSQL / Supabase

create extension if not exists pgcrypto;

-- Enums
create type public.app_role as enum ('admin', 'operator');
create type public.payment_method as enum ('pix', 'credit', 'debit', 'cash');
create type public.shift_status as enum ('open', 'closed');
create type public.tx_status as enum ('posted', 'voided');

-- Core tables
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'operator',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booths (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  location text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.operator_booths (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.profiles(user_id) on delete cascade,
  booth_id uuid not null references public.booths(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(operator_id, booth_id)
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  commission_percent numeric(6,3) not null check (commission_percent >= 0 and commission_percent <= 100),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  booth_id uuid not null references public.booths(id),
  operator_id uuid not null references public.profiles(user_id),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  status public.shift_status not null default 'open',
  opened_by_ip text,
  closed_by_ip text,
  notes text,
  created_at timestamptz not null default now(),
  constraint shift_close_check check ((status = 'open' and closed_at is null) or (status = 'closed' and closed_at is not null))
);

create unique index if not exists shifts_one_open_per_operator
on public.shifts(operator_id)
where status = 'open';

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete restrict,
  booth_id uuid not null references public.booths(id),
  operator_id uuid not null references public.profiles(user_id),
  company_id uuid not null references public.companies(id),
  sold_at timestamptz not null default now(),
  ticket_reference text,
  amount numeric(12,2) not null check (amount > 0),
  payment_method public.payment_method not null,
  commission_percent numeric(6,3) not null check (commission_percent >= 0 and commission_percent <= 100),
  commission_amount numeric(12,2) not null,
  status public.tx_status not null default 'posted',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_shift_idx on public.transactions(shift_id);
create index if not exists transactions_booth_idx on public.transactions(booth_id);
create index if not exists transactions_operator_idx on public.transactions(operator_id);
create index if not exists transactions_company_idx on public.transactions(company_id);
create index if not exists transactions_sold_at_idx on public.transactions(sold_at desc);

create table if not exists public.transaction_receipts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  uploaded_by uuid not null references public.profiles(user_id),
  uploaded_at timestamptz not null default now()
);

create table if not exists public.adjustment_requests (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  requested_by uuid not null references public.profiles(user_id),
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references public.profiles(user_id),
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(user_id),
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Helper functions
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = uid and p.role = 'admin' and p.active = true
  );
$$;

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
as $$
  select p.role from public.profiles p where p.user_id = auth.uid();
$$;

-- Triggers
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.tg_set_updated_at();

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at before update on public.companies
for each row execute function public.tg_set_updated_at();

drop trigger if exists transactions_set_updated_at on public.transactions;
create trigger transactions_set_updated_at before update on public.transactions
for each row execute function public.tg_set_updated_at();

create or replace function public.tg_fill_commission_from_company()
returns trigger
language plpgsql
as $$
declare
  pct numeric(6,3);
begin
  if new.commission_percent is null then
    select c.commission_percent into pct from public.companies c where c.id = new.company_id;
    new.commission_percent = coalesce(pct, 0);
  end if;

  new.commission_amount = round((new.amount * new.commission_percent / 100.0)::numeric, 2);
  return new;
end;
$$;

drop trigger if exists transactions_fill_commission on public.transactions;
create trigger transactions_fill_commission
before insert or update of amount, company_id, commission_percent on public.transactions
for each row execute function public.tg_fill_commission_from_company();

create or replace function public.require_receipt_for_card()
returns trigger
language plpgsql
as $$
declare
  has_receipt boolean;
begin
  if new.status = 'posted' and new.payment_method in ('credit','debit') then
    select exists(
      select 1 from public.transaction_receipts r where r.transaction_id = new.id
    ) into has_receipt;

    if not has_receipt then
      raise exception 'Comprovante obrigatório para crédito/débito';
    end if;
  end if;

  return new;
end;
$$;

-- RPCs
create or replace function public.open_shift(p_booth_id uuid, p_ip text default null)
returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shifts;
  allowed boolean;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if public.is_admin(auth.uid()) then
    allowed := true;
  else
    select exists (
      select 1 from public.operator_booths ob
      where ob.operator_id = auth.uid() and ob.booth_id = p_booth_id and ob.active = true
    ) into allowed;
  end if;

  if not allowed then
    raise exception 'Operador sem permissão para este guichê';
  end if;

  insert into public.shifts (booth_id, operator_id, opened_by_ip)
  values (p_booth_id, auth.uid(), p_ip)
  returning * into s;

  return s;
end;
$$;

create or replace function public.close_shift(p_shift_id uuid, p_ip text default null, p_notes text default null)
returns public.shifts
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.shifts;
begin
  update public.shifts
  set status = 'closed',
      closed_at = now(),
      closed_by_ip = p_ip,
      notes = coalesce(p_notes, notes)
  where id = p_shift_id
    and status = 'open'
    and (
      operator_id = auth.uid()
      or public.is_admin(auth.uid())
    )
  returning * into s;

  if s.id is null then
    raise exception 'Turno não encontrado, já fechado ou sem permissão';
  end if;

  return s;
end;
$$;

-- Views
create or replace view public.v_shift_totals as
select
  s.id as shift_id,
  s.booth_id,
  b.name as booth_name,
  s.operator_id,
  p.full_name as operator_name,
  s.opened_at,
  s.closed_at,
  s.status,
  count(t.id) filter (where t.status = 'posted') as tx_count,
  coalesce(sum(t.amount) filter (where t.status = 'posted'), 0)::numeric(12,2) as gross_amount,
  coalesce(sum(t.commission_amount) filter (where t.status = 'posted'), 0)::numeric(12,2) as commission_amount,
  coalesce(sum(t.amount) filter (where t.status = 'posted' and t.payment_method='pix'), 0)::numeric(12,2) as total_pix,
  coalesce(sum(t.amount) filter (where t.status = 'posted' and t.payment_method='credit'), 0)::numeric(12,2) as total_credit,
  coalesce(sum(t.amount) filter (where t.status = 'posted' and t.payment_method='debit'), 0)::numeric(12,2) as total_debit,
  coalesce(sum(t.amount) filter (where t.status = 'posted' and t.payment_method='cash'), 0)::numeric(12,2) as total_cash,
  count(t.id) filter (where t.status='posted' and t.payment_method in ('credit','debit')) as card_tx_count,
  count(r.id) as card_receipt_count,
  (count(t.id) filter (where t.status='posted' and t.payment_method in ('credit','debit')) - count(r.id)) as missing_card_receipts
from public.shifts s
join public.booths b on b.id = s.booth_id
join public.profiles p on p.user_id = s.operator_id
left join public.transactions t on t.shift_id = s.id
left join public.transaction_receipts r on r.transaction_id = t.id
group by s.id, b.name, p.full_name;

-- RLS
alter table public.profiles enable row level security;
alter table public.booths enable row level security;
alter table public.operator_booths enable row level security;
alter table public.companies enable row level security;
alter table public.shifts enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_receipts enable row level security;
alter table public.adjustment_requests enable row level security;
alter table public.audit_logs enable row level security;

-- profiles
create policy profiles_self_or_admin_select on public.profiles
for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy profiles_admin_write on public.profiles
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- booths / companies (read for authenticated, write admin)
create policy booths_read_authenticated on public.booths
for select using (auth.uid() is not null);

create policy booths_admin_write on public.booths
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy companies_read_authenticated on public.companies
for select using (auth.uid() is not null);

create policy companies_admin_write on public.companies
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- operator_booths
create policy operator_booths_self_or_admin_select on public.operator_booths
for select using (operator_id = auth.uid() or public.is_admin(auth.uid()));

create policy operator_booths_admin_write on public.operator_booths
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- shifts
create policy shifts_self_or_admin_select on public.shifts
for select using (operator_id = auth.uid() or public.is_admin(auth.uid()));

create policy shifts_operator_insert on public.shifts
for insert with check (
  operator_id = auth.uid()
  and (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.operator_booths ob
      where ob.operator_id = auth.uid() and ob.booth_id = shifts.booth_id and ob.active = true
    )
  )
);

create policy shifts_close_self_or_admin on public.shifts
for update using (operator_id = auth.uid() or public.is_admin(auth.uid()))
with check (operator_id = auth.uid() or public.is_admin(auth.uid()));

-- transactions
create policy tx_self_or_admin_select on public.transactions
for select using (operator_id = auth.uid() or public.is_admin(auth.uid()));

create policy tx_operator_insert on public.transactions
for insert with check (
  operator_id = auth.uid()
  and exists (
    select 1 from public.shifts s
    where s.id = transactions.shift_id
      and s.operator_id = auth.uid()
      and s.status = 'open'
  )
);

create policy tx_admin_update on public.transactions
for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- receipts
create policy receipts_self_or_admin_select on public.transaction_receipts
for select using (
  public.is_admin(auth.uid())
  or exists (
    select 1 from public.transactions t
    where t.id = transaction_id and t.operator_id = auth.uid()
  )
);

create policy receipts_self_insert on public.transaction_receipts
for insert with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.transactions t
    where t.id = transaction_id and t.operator_id = auth.uid()
  )
);

create policy receipts_admin_delete on public.transaction_receipts
for delete using (public.is_admin(auth.uid()));

-- adjustment requests
create policy adj_self_or_admin_select on public.adjustment_requests
for select using (
  requested_by = auth.uid() or public.is_admin(auth.uid())
);

create policy adj_self_insert on public.adjustment_requests
for insert with check (requested_by = auth.uid());

create policy adj_admin_update on public.adjustment_requests
for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- audit logs
create policy audit_self_or_admin_select on public.audit_logs
for select using (created_by = auth.uid() or public.is_admin(auth.uid()));

create policy audit_insert_authenticated on public.audit_logs
for insert with check (created_by = auth.uid());

-- Grants for RPCs
grant execute on function public.open_shift(uuid, text) to authenticated;
grant execute on function public.close_shift(uuid, text, text) to authenticated;

-- ===== Block 1: Categories / Subcategories =====
create table if not exists public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.transaction_categories(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(category_id, name)
);

alter table public.transactions add column if not exists category_id uuid references public.transaction_categories(id);
alter table public.transactions add column if not exists subcategory_id uuid references public.transaction_subcategories(id);

create index if not exists transactions_category_idx on public.transactions(category_id);
create index if not exists transactions_subcategory_idx on public.transactions(subcategory_id);

alter table public.transaction_categories enable row level security;
alter table public.transaction_subcategories enable row level security;

create policy tx_categories_read_authenticated on public.transaction_categories
for select using (auth.uid() is not null);

create policy tx_categories_admin_write on public.transaction_categories
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create policy tx_subcategories_read_authenticated on public.transaction_subcategories
for select using (auth.uid() is not null);

create policy tx_subcategories_admin_write on public.transaction_subcategories
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
