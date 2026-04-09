-- Guichê Gestão - Schema inicial
-- PostgreSQL / Supabase

create extension if not exists pgcrypto;

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'tenant_admin', 'financeiro', 'operator');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum ('pix', 'credit', 'debit', 'cash');
  end if;

  if not exists (select 1 from pg_type where typname = 'shift_status') then
    create type public.shift_status as enum ('open', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'tx_status') then
    create type public.tx_status as enum ('posted', 'voided');
  end if;
end $$;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.tenants (slug, name)
select 'default', 'Tenant Padrão'
where not exists (select 1 from public.tenants where slug = 'default');

-- Core tables
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  cpf text,
  address text,
  phone text,
  avatar_url text,
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
  dia_repasse smallint check (dia_repasse is null or (dia_repasse between 1 and 31)),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create index if not exists clients_name_idx on public.clients(name);

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

create table if not exists public.time_punches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id),
  booth_id uuid references public.booths(id),
  shift_id uuid references public.shifts(id),
  punch_type text not null check (punch_type in ('entrada','saida','pausa_inicio','pausa_fim')),
  note text,
  punched_at timestamptz not null default now()
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete cascade,
  booth_id uuid not null references public.booths(id),
  user_id uuid not null references public.profiles(user_id),
  movement_type text not null check (movement_type in ('suprimento','sangria','ajuste')),
  amount numeric(12,2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists cash_movements_shift_idx on public.cash_movements(shift_id);
create index if not exists cash_movements_booth_idx on public.cash_movements(booth_id);
create index if not exists cash_movements_user_idx on public.cash_movements(user_id);

create table if not exists public.shift_cash_closings (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null unique references public.shifts(id) on delete cascade,
  booth_id uuid not null references public.booths(id),
  user_id uuid not null references public.profiles(user_id),
  expected_cash numeric(12,2) not null,
  declared_cash numeric(12,2) not null,
  difference numeric(12,2) not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists shift_cash_closings_shift_idx on public.shift_cash_closings(shift_id);
create index if not exists shift_cash_closings_booth_idx on public.shift_cash_closings(booth_id);
create index if not exists shift_cash_closings_user_idx on public.shift_cash_closings(user_id);

-- Compatibilidade SaaS / recovery-safe
do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role') then
    begin alter type public.app_role add value if not exists 'tenant_admin'; exception when duplicate_object then null; end;
    begin alter type public.app_role add value if not exists 'financeiro'; exception when duplicate_object then null; end;
  end if;
end $$;

alter table if exists public.profiles add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.booths add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.operator_booths add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.companies add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.companies add column if not exists payout_days integer not null default 0;
alter table if exists public.clients add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.shifts add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.transactions add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.transactions add column if not exists boarding_tax_state numeric(12,2) not null default 0;
alter table if exists public.transactions add column if not exists boarding_tax_federal numeric(12,2) not null default 0;
alter table if exists public.transaction_receipts add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.adjustment_requests add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.audit_logs add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.time_punches add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.cash_movements add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.shift_cash_closings add column if not exists tenant_id uuid references public.tenants(id);

update public.profiles set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.booths set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.operator_booths set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.companies set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.clients set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.shifts set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.transactions set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.transaction_receipts set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.adjustment_requests set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.audit_logs set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.time_punches set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.cash_movements set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.shift_cash_closings set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;

create index if not exists idx_profiles_tenant on public.profiles(tenant_id);
create index if not exists idx_booths_tenant on public.booths(tenant_id);
create index if not exists idx_companies_tenant on public.companies(tenant_id);
create index if not exists idx_shifts_tenant on public.shifts(tenant_id);
create index if not exists idx_transactions_tenant on public.transactions(tenant_id);

-- Helper functions
create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = check_user_id and p.role in ('admin', 'tenant_admin') and p.active = true
  );
$$;

create or replace function public.can_read_admin_data(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = uid and p.role in ('admin', 'tenant_admin', 'financeiro') and p.active = true
  );
$$;

create or replace function public.current_profile_role()
returns public.app_role
language sql
stable
as $$
  select coalesce(
    (
      select p.role::public.app_role
      from public.profiles p
      where p.user_id = auth.uid()
      limit 1
    ),
    'operator'::public.app_role
  );
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
alter table public.clients enable row level security;
alter table public.shifts enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_receipts enable row level security;
alter table public.adjustment_requests enable row level security;
alter table public.audit_logs enable row level security;
alter table public.time_punches enable row level security;
alter table public.cash_movements enable row level security;
alter table public.shift_cash_closings enable row level security;

-- profiles
drop policy if exists profiles_self_or_admin_select on public.profiles;
create policy profiles_self_or_admin_select on public.profiles
for select using (user_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists profiles_admin_write on public.profiles;
create policy profiles_admin_write on public.profiles
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- booths / companies (read for authenticated, write admin)
drop policy if exists booths_read_authenticated on public.booths;
create policy booths_read_authenticated on public.booths
for select using (auth.uid() is not null);

drop policy if exists booths_admin_write on public.booths;
create policy booths_admin_write on public.booths
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists companies_read_authenticated on public.companies;
create policy companies_read_authenticated on public.companies
for select using (auth.uid() is not null);

drop policy if exists companies_admin_write on public.companies;
create policy companies_admin_write on public.companies
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists clients_read_authenticated on public.clients;
create policy clients_read_authenticated on public.clients
for select using (auth.uid() is not null);

drop policy if exists clients_admin_write on public.clients;
create policy clients_admin_write on public.clients
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- operator_booths
drop policy if exists operator_booths_self_or_admin_select on public.operator_booths;
create policy operator_booths_self_or_admin_select on public.operator_booths
for select using (operator_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists operator_booths_admin_write on public.operator_booths;
create policy operator_booths_admin_write on public.operator_booths
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- shifts
drop policy if exists shifts_self_or_admin_select on public.shifts;
create policy shifts_self_or_admin_select on public.shifts
for select using (operator_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists shifts_operator_insert on public.shifts;
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

drop policy if exists shifts_close_self_or_admin on public.shifts;
create policy shifts_close_self_or_admin on public.shifts
for update using (operator_id = auth.uid() or public.is_admin(auth.uid()))
with check (operator_id = auth.uid() or public.is_admin(auth.uid()));

-- transactions
drop policy if exists tx_self_or_admin_select on public.transactions;
create policy tx_self_or_admin_select on public.transactions
for select using (operator_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists tx_operator_insert on public.transactions;
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

drop policy if exists tx_admin_update on public.transactions;
create policy tx_admin_update on public.transactions
for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- receipts
drop policy if exists receipts_self_or_admin_select on public.transaction_receipts;
create policy receipts_self_or_admin_select on public.transaction_receipts
for select using (
  public.can_read_admin_data(auth.uid())
  or exists (
    select 1 from public.transactions t
    where t.id = transaction_id and t.operator_id = auth.uid()
  )
);

drop policy if exists receipts_self_insert on public.transaction_receipts;
create policy receipts_self_insert on public.transaction_receipts
for insert with check (
  uploaded_by = auth.uid()
  and exists (
    select 1 from public.transactions t
    where t.id = transaction_id and t.operator_id = auth.uid()
  )
);

drop policy if exists receipts_admin_delete on public.transaction_receipts;
create policy receipts_admin_delete on public.transaction_receipts
for delete using (public.is_admin(auth.uid()));

-- adjustment requests
drop policy if exists adj_self_or_admin_select on public.adjustment_requests;
create policy adj_self_or_admin_select on public.adjustment_requests
for select using (
  requested_by = auth.uid() or public.can_read_admin_data(auth.uid())
);

drop policy if exists adj_self_insert on public.adjustment_requests;
create policy adj_self_insert on public.adjustment_requests
for insert with check (requested_by = auth.uid());

drop policy if exists adj_admin_update on public.adjustment_requests;
create policy adj_admin_update on public.adjustment_requests
for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- audit logs
drop policy if exists audit_self_or_admin_select on public.audit_logs;
create policy audit_self_or_admin_select on public.audit_logs
for select using (created_by = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists audit_insert_authenticated on public.audit_logs;
create policy audit_insert_authenticated on public.audit_logs
for insert with check (created_by = auth.uid());

-- time punches
drop policy if exists time_punch_self_or_admin_select on public.time_punches;
create policy time_punch_self_or_admin_select on public.time_punches
for select using (user_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists time_punch_self_insert on public.time_punches;
create policy time_punch_self_insert on public.time_punches
for insert with check (user_id = auth.uid());

-- cash movements
drop policy if exists cash_movements_self_or_admin_select on public.cash_movements;
create policy cash_movements_self_or_admin_select on public.cash_movements
for select using (user_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists cash_movements_self_insert on public.cash_movements;
create policy cash_movements_self_insert on public.cash_movements
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.shifts s
    where s.id = cash_movements.shift_id
      and s.operator_id = auth.uid()
      and s.status = 'open'
  )
);

drop policy if exists cash_movements_admin_update on public.cash_movements;
create policy cash_movements_admin_update on public.cash_movements
for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- shift cash closings
drop policy if exists shift_cash_closings_self_or_admin_select on public.shift_cash_closings;
create policy shift_cash_closings_self_or_admin_select on public.shift_cash_closings
for select using (user_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists shift_cash_closings_self_insert on public.shift_cash_closings;
create policy shift_cash_closings_self_insert on public.shift_cash_closings
for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.shifts s
    where s.id = shift_cash_closings.shift_id
      and s.operator_id = auth.uid()
  )
);

drop policy if exists shift_cash_closings_admin_update on public.shift_cash_closings;
create policy shift_cash_closings_admin_update on public.shift_cash_closings
for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Grants for RPCs
grant execute on function public.open_shift(uuid, text) to authenticated;
grant execute on function public.close_shift(uuid, text, text) to authenticated;

-- ===== Block 1: Categories / Subcategories =====
create table if not exists public.transaction_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transaction_subcategories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id),
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
create index if not exists transaction_categories_tenant_idx on public.transaction_categories(tenant_id);
create index if not exists transaction_subcategories_tenant_idx on public.transaction_subcategories(tenant_id);

alter table public.transaction_categories enable row level security;
alter table public.transaction_subcategories enable row level security;

drop policy if exists tx_categories_read_authenticated on public.transaction_categories;
create policy tx_categories_read_authenticated on public.transaction_categories
for select using (auth.uid() is not null);

drop policy if exists tx_categories_admin_write on public.transaction_categories;
create policy tx_categories_admin_write on public.transaction_categories
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists tx_subcategories_read_authenticated on public.transaction_subcategories;
create policy tx_subcategories_read_authenticated on public.transaction_subcategories
for select using (auth.uid() is not null);

drop policy if exists tx_subcategories_admin_write on public.transaction_subcategories;
create policy tx_subcategories_admin_write on public.transaction_subcategories
for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- ===== Block 2: Attendance / Boarding taxes / Chat =====
create table if not exists public.user_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_user_date on public.user_attendance(user_id, clock_in desc);
alter table public.user_attendance enable row level security;

drop policy if exists user_attendance_self_insert on public.user_attendance;
create policy user_attendance_self_insert on public.user_attendance
for insert with check (auth.uid() = user_id);

drop policy if exists user_attendance_self_update on public.user_attendance;
create policy user_attendance_self_update on public.user_attendance
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists user_attendance_self_or_admin_select on public.user_attendance;
create policy user_attendance_self_or_admin_select on public.user_attendance
for select using (user_id = auth.uid() or public.can_read_admin_data(auth.uid()));

create table if not exists public.boarding_taxes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(12,2) not null check (amount >= 0),
  tax_type text not null check (tax_type in ('estadual', 'federal')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (name, tax_type)
);

create index if not exists boarding_taxes_active_idx on public.boarding_taxes(active);
create index if not exists boarding_taxes_type_idx on public.boarding_taxes(tax_type);
alter table public.boarding_taxes enable row level security;

insert into public.boarding_taxes (name, amount, tax_type, active)
values
  ('Goiania', 8.50, 'estadual', true),
  ('Belem', 12.00, 'estadual', true)
on conflict (name, tax_type) do nothing;

drop policy if exists boarding_taxes_select_active_or_admin on public.boarding_taxes;
create policy boarding_taxes_select_active_or_admin on public.boarding_taxes
for select using (active = true or public.can_read_admin_data(auth.uid()));

drop policy if exists boarding_taxes_admin_insert on public.boarding_taxes;
create policy boarding_taxes_admin_insert on public.boarding_taxes
for insert with check (public.is_admin(auth.uid()));

drop policy if exists boarding_taxes_admin_update on public.boarding_taxes;
create policy boarding_taxes_admin_update on public.boarding_taxes
for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

create table if not exists public.operator_messages (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.profiles(user_id) on delete cascade,
  booth_id uuid references public.booths(id) on delete set null,
  sender_role text not null default 'operator' check (sender_role in ('operator', 'admin', 'tenant_admin', 'financeiro')),
  message text not null check (char_length(trim(message)) between 1 and 2000),
  read boolean not null default false,
  read_at timestamptz,
  read_by uuid references public.profiles(user_id),
  attachment_path text,
  attachment_name text,
  attachment_type text,
  attachment_size bigint,
  created_at timestamptz not null default now()
);

alter table if exists public.operator_messages add column if not exists booth_id uuid references public.booths(id) on delete set null;
alter table if exists public.operator_messages add column if not exists sender_role text not null default 'operator';
alter table if exists public.operator_messages add column if not exists read_at timestamptz;
alter table if exists public.operator_messages add column if not exists read_by uuid references public.profiles(user_id);
alter table if exists public.operator_messages add column if not exists attachment_path text;
alter table if exists public.operator_messages add column if not exists attachment_name text;
alter table if exists public.operator_messages add column if not exists attachment_type text;
alter table if exists public.operator_messages add column if not exists attachment_size bigint;

create index if not exists idx_operator_messages_operator_id on public.operator_messages(operator_id);
create index if not exists idx_operator_messages_booth_id on public.operator_messages(booth_id);
create index if not exists idx_operator_messages_read on public.operator_messages(read);
create index if not exists idx_operator_messages_created_at on public.operator_messages(created_at desc);
create index if not exists idx_operator_messages_conversation on public.operator_messages(operator_id, booth_id, created_at desc);
alter table public.operator_messages enable row level security;

drop policy if exists operator_messages_select_self_or_admin on public.operator_messages;
create policy operator_messages_select_self_or_admin on public.operator_messages
for select using (operator_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists operator_messages_insert_self_or_admin on public.operator_messages;
create policy operator_messages_insert_self_or_admin on public.operator_messages
for insert with check (
  (operator_id = auth.uid() and sender_role = 'operator')
  or (public.can_read_admin_data(auth.uid()) and sender_role in ('admin', 'tenant_admin', 'financeiro'))
);

drop policy if exists operator_messages_update_self_or_admin on public.operator_messages;
create policy operator_messages_update_self_or_admin on public.operator_messages
for update using (operator_id = auth.uid() or public.can_read_admin_data(auth.uid()))
with check (operator_id = auth.uid() or public.can_read_admin_data(auth.uid()));
