-- Recovery Bootstrap (2026-03-01)
-- Objetivo: recriar estrutura mínima para /rebuild/admin e /rebuild/operator funcionarem
-- Pode ser executado em banco recém-resetado.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin', 'operator');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('pix', 'credit', 'debit', 'cash');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.shift_status as enum ('open', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.tx_status as enum ('posted', 'voided');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Usuário',
  role public.app_role not null default 'operator',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  commission_percent numeric(6,3) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booths (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.operator_booths (
  id uuid primary key default gen_random_uuid(),
  operator_id uuid not null references public.profiles(user_id) on delete cascade,
  booth_id uuid not null references public.booths(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (operator_id, booth_id)
);

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
  unique (category_id, name)
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  booth_id uuid not null references public.booths(id),
  operator_id uuid not null references public.profiles(user_id),
  status public.shift_status not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opened_by_ip text,
  closed_by_ip text,
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists shifts_one_open_per_operator on public.shifts(operator_id) where status = 'open';

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts(id) on delete restrict,
  booth_id uuid not null references public.booths(id),
  operator_id uuid not null references public.profiles(user_id),
  company_id uuid not null references public.companies(id),
  category_id uuid references public.transaction_categories(id),
  subcategory_id uuid references public.transaction_subcategories(id),
  sold_at timestamptz not null default now(),
  payment_method public.payment_method not null,
  amount numeric(12,2) not null check (amount > 0),
  ticket_reference text,
  note text,
  commission_percent numeric(6,3) not null default 0,
  commission_amount numeric(12,2) not null default 0,
  status public.tx_status not null default 'posted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transaction_receipts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  uploaded_by uuid not null references public.profiles(user_id),
  uploaded_at timestamptz not null default now()
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

create table if not exists public.time_punches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(user_id) on delete set null,
  booth_id uuid references public.booths(id) on delete set null,
  shift_id uuid references public.shifts(id) on delete set null,
  punch_type text not null,
  note text,
  punched_at timestamptz not null default now()
);

insert into public.transaction_categories (name, active)
select x.name, true from (values ('Passagens'), ('Serviços'), ('Outros')) as x(name)
where not exists (select 1 from public.transaction_categories c where c.name = x.name);

insert into public.transaction_subcategories (category_id, name, active)
select c.id, 'Geral', true
from public.transaction_categories c
where not exists (
  select 1 from public.transaction_subcategories s
  where s.category_id = c.id and s.name = 'Geral'
);

insert into public.companies (name, commission_percent, active)
select x.name, x.commission, true
from (values ('Empresa Padrão', 0.0), ('Empresa Exemplo', 5.0)) as x(name, commission)
where not exists (select 1 from public.companies c where c.name = x.name);

insert into public.booths (code, name, active)
select x.code, x.name, true
from (values ('G1', 'Guichê 1'), ('G2', 'Guichê 2')) as x(code, name)
where not exists (select 1 from public.booths b where b.code = x.code);

create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = uid and p.role = 'admin' and p.active = true
  );
$$;

create or replace function public.open_shift(p_booth_id uuid, p_ip text default null)
returns public.shifts
language plpgsql security definer set search_path = public as $$
declare s public.shifts;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  insert into public.shifts (booth_id, operator_id, opened_by_ip)
  values (p_booth_id, auth.uid(), p_ip)
  returning * into s;

  return s;
end;
$$;

create or replace function public.close_shift(p_shift_id uuid, p_ip text default null, p_notes text default null)
returns public.shifts
language plpgsql security definer set search_path = public as $$
declare s public.shifts;
begin
  update public.shifts
     set status = 'closed', closed_at = now(), closed_by_ip = p_ip, notes = coalesce(p_notes, notes)
   where id = p_shift_id and status = 'open' and (operator_id = auth.uid() or public.is_admin(auth.uid()))
  returning * into s;

  if s.id is null then
    raise exception 'Turno não encontrado, já fechado ou sem permissão';
  end if;

  return s;
end;
$$;

grant execute on function public.open_shift(uuid, text) to authenticated;
grant execute on function public.close_shift(uuid, text, text) to authenticated;

insert into storage.buckets (id, name, public)
select 'payment-receipts', 'payment-receipts', false
where not exists (select 1 from storage.buckets where id = 'payment-receipts');

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Payment receipts read own bucket'
  ) then
    create policy "Payment receipts read own bucket"
      on storage.objects
      for select
      to authenticated
      using (bucket_id = 'payment-receipts');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Payment receipts write own bucket'
  ) then
    create policy "Payment receipts write own bucket"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'payment-receipts');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Payment receipts update own bucket'
  ) then
    create policy "Payment receipts update own bucket"
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'payment-receipts')
      with check (bucket_id = 'payment-receipts');
  end if;
end $$;
