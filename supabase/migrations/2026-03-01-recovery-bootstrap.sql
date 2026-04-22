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

create or replace function public.is_admin(check_user_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = check_user_id and p.role = 'admin' and p.active = true
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

insert into storage.buckets (id, name, public)
select 'chat-attachments', 'chat-attachments', false
where not exists (select 1 from storage.buckets where id = 'chat-attachments');

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

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Chat attachments upload own folder or admin'
  ) then
    create policy "Chat attachments upload own folder or admin"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'chat-attachments'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or public.is_admin(auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Chat attachments select own folder or admin'
  ) then
    create policy "Chat attachments select own folder or admin"
      on storage.objects
      for select
      to authenticated
      using (
        bucket_id = 'chat-attachments'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or public.can_read_admin_data(auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Chat attachments update own folder or admin'
  ) then
    create policy "Chat attachments update own folder or admin"
      on storage.objects
      for update
      to authenticated
      using (
        bucket_id = 'chat-attachments'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or public.is_admin(auth.uid())
        )
      )
      with check (
        bucket_id = 'chat-attachments'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or public.is_admin(auth.uid())
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and policyname = 'Chat attachments delete own folder or admin'
  ) then
    create policy "Chat attachments delete own folder or admin"
      on storage.objects
      for delete
      to authenticated
      using (
        bucket_id = 'chat-attachments'
        and (
          split_part(name, '/', 1) = auth.uid()::text
          or public.is_admin(auth.uid())
        )
      );
  end if;
end $$;

-- ===== Compatibilidade com o rebuild atual =====

do $$
begin
  if exists (select 1 from pg_type where typname = 'app_role') then
    begin alter type public.app_role add value if not exists 'tenant_admin'; exception when duplicate_object then null; end;
    begin alter type public.app_role add value if not exists 'financeiro'; exception when duplicate_object then null; end;
  end if;

  if exists (select 1 from pg_type where typname = 'tx_status') then
    begin alter type public.tx_status add value if not exists 'settled'; exception when duplicate_object then null; end;
  end if;
end $$;

create or replace function public.can_read_admin_data(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = uid
      and p.role in ('admin', 'tenant_admin', 'financeiro')
      and p.active = true
  );
$$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(user_id),
  action text not null,
  entity text,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

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

create table if not exists public.user_attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  clock_in timestamptz not null default now(),
  clock_out timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_attendance_user_date on public.user_attendance(user_id, clock_in desc);

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

insert into public.boarding_taxes (name, amount, tax_type, active)
values
  ('Goiania', 8.50, 'estadual', true),
  ('Belem', 12.00, 'estadual', true)
on conflict (name, tax_type) do nothing;

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

create index if not exists idx_operator_messages_operator_id on public.operator_messages(operator_id);
create index if not exists idx_operator_messages_booth_id on public.operator_messages(booth_id);
create index if not exists idx_operator_messages_read on public.operator_messages(read);
create index if not exists idx_operator_messages_created_at on public.operator_messages(created_at desc);
create index if not exists idx_operator_messages_conversation on public.operator_messages(operator_id, booth_id, created_at desc);

create table if not exists public.daily_cash_closings (
  id uuid primary key default gen_random_uuid(),
  office_id uuid not null references public.booths(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  date date not null,
  company text not null,
  total_sold numeric(12,2) not null default 0 check (total_sold >= 0),
  amount_pix numeric(12,2) not null default 0 check (amount_pix >= 0),
  amount_card numeric(12,2) not null default 0 check (amount_card >= 0),
  amount_cash numeric(12,2) not null default 0 check (amount_cash >= 0),
  ceia_amount numeric(12,2) not null default 0 check (ceia_amount >= 0),
  ceia_base numeric(12,2) not null default 0 check (ceia_base >= 0),
  ceia_pix numeric(12,2) not null default 0 check (ceia_pix >= 0),
  ceia_debito numeric(12,2) not null default 0 check (ceia_debito >= 0),
  ceia_credito numeric(12,2) not null default 0 check (ceia_credito >= 0),
  ceia_link_estadual numeric(12,2) not null default 0 check (ceia_link_estadual >= 0),
  ceia_link_interestadual numeric(12,2) not null default 0 check (ceia_link_interestadual >= 0),
  ceia_dinheiro numeric(12,2) not null default 0 check (ceia_dinheiro >= 0),
  ceia_total_lancado numeric(12,2) not null default 0 check (ceia_total_lancado >= 0),
  ceia_faltante numeric(12,2) not null default 0,
  qtd_taxa_estadual integer not null default 0 check (qtd_taxa_estadual >= 0),
  qtd_taxa_interestadual integer not null default 0 check (qtd_taxa_interestadual >= 0),
  link_pagamento numeric(12,2) not null default 0 check (link_pagamento >= 0),
  costs_amount numeric(12,2) not null default 0 check (costs_amount >= 0),
  sangria_amount numeric(12,2) not null default 0 check (sangria_amount >= 0),
  cash_net numeric(12,2) not null default 0,
  status text not null default 'open' check (status in ('open', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (office_id, user_id, date, company)
);

create index if not exists daily_cash_closings_office_idx on public.daily_cash_closings(office_id, date desc);
create index if not exists daily_cash_closings_user_idx on public.daily_cash_closings(user_id, date desc);
create index if not exists daily_cash_closings_company_idx on public.daily_cash_closings(company);
create index if not exists daily_cash_closings_status_date_idx on public.daily_cash_closings(status, date desc);

create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists daily_cash_closings_set_updated_at on public.daily_cash_closings;
create trigger daily_cash_closings_set_updated_at before update on public.daily_cash_closings
for each row execute function public.tg_set_updated_at();

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
      where ob.operator_id = auth.uid()
        and ob.booth_id = p_booth_id
        and ob.active = true
    ) into allowed;
  end if;

  if not allowed then
    raise exception 'Operador sem permissão para este guichê';
  end if;

  if exists (
    select 1 from public.shifts open_shift_row
    where open_shift_row.booth_id = p_booth_id
      and open_shift_row.status = 'open'
  ) then
    raise exception 'Já existe um turno aberto neste guichê';
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
  if not exists (
    select 1 from public.shift_cash_closings closing_row
    where closing_row.shift_id = p_shift_id
  ) then
    raise exception 'Registre o fechamento de caixa antes de encerrar o turno';
  end if;

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
  count(t.id) filter (where t.status <> 'voided') as tx_count,
  coalesce(sum(t.amount) filter (where t.status <> 'voided'), 0)::numeric(12,2) as gross_amount,
  coalesce(sum(t.commission_amount) filter (where t.status <> 'voided'), 0)::numeric(12,2) as commission_amount,
  coalesce(sum(t.amount) filter (where t.status <> 'voided' and t.payment_method='pix'), 0)::numeric(12,2) as total_pix,
  coalesce(sum(t.amount) filter (where t.status <> 'voided' and t.payment_method='credit'), 0)::numeric(12,2) as total_credit,
  coalesce(sum(t.amount) filter (where t.status <> 'voided' and t.payment_method='debit'), 0)::numeric(12,2) as total_debit,
  coalesce(sum(t.amount) filter (where t.status <> 'voided' and t.payment_method='cash'), 0)::numeric(12,2) as total_cash,
  count(t.id) filter (where t.status <> 'voided' and t.payment_method in ('credit','debit')) as card_tx_count,
  count(r.id) as card_receipt_count,
  (count(t.id) filter (where t.status <> 'voided' and t.payment_method in ('credit','debit')) - count(r.id)) as missing_card_receipts
from public.shifts s
join public.booths b on b.id = s.booth_id
join public.profiles p on p.user_id = s.operator_id
left join public.transactions t on t.shift_id = s.id
left join public.transaction_receipts r on r.transaction_id = t.id
group by s.id, b.name, p.full_name;

create or replace view public.v_admin_cash_audit as
select
  d.id,
  d.office_id,
  d.user_id,
  d.date,
  d.company,
  d.total_sold,
  d.ceia_base as total_informado,
  d.ceia_base as total_cea,
  (
    coalesce(d.ceia_pix, 0)
    + coalesce(d.ceia_debito, 0)
    + coalesce(d.ceia_credito, 0)
    + coalesce(d.ceia_dinheiro, 0)
    + coalesce(d.link_pagamento, 0)
  )::numeric(12,2) as total_lancado_sem_taxas,
  d.ceia_link_estadual as taxa_estadual,
  d.ceia_link_interestadual as taxa_interestadual,
  (
    coalesce(d.ceia_link_estadual, 0)
    + coalesce(d.ceia_link_interestadual, 0)
  )::numeric(12,2) as total_taxas,
  (
    coalesce(d.ceia_pix, 0)
    + coalesce(d.ceia_debito, 0)
    + coalesce(d.ceia_credito, 0)
    + coalesce(d.ceia_dinheiro, 0)
    + coalesce(d.link_pagamento, 0)
    + coalesce(d.ceia_link_estadual, 0)
    + coalesce(d.ceia_link_interestadual, 0)
  )::numeric(12,2) as total_geral_lancado,
  d.amount_pix,
  d.amount_card,
  d.amount_cash,
  d.ceia_amount,
  d.ceia_base,
  d.ceia_pix,
  d.ceia_debito,
  d.ceia_credito,
  d.ceia_link_estadual,
  d.ceia_link_interestadual,
  d.ceia_dinheiro,
  d.ceia_total_lancado,
  d.ceia_total_lancado as total_lancado,
  d.ceia_faltante,
  d.ceia_faltante as diferenca,
  d.ceia_faltante as diferenca_cea,
  d.qtd_taxa_estadual,
  d.qtd_taxa_interestadual,
  d.link_pagamento,
  d.costs_amount,
  d.sangria_amount,
  (
    coalesce(d.costs_amount, 0)
    + coalesce(d.sangria_amount, 0)
  )::numeric(12,2) as total_abatimentos,
  (
    coalesce(d.ceia_total_lancado, 0)
    - coalesce(d.costs_amount, 0)
    - coalesce(d.sangria_amount, 0)
  )::numeric(12,2) as resultado_liquido,
  d.cash_net,
  d.status,
  case
    when abs(coalesce(d.ceia_faltante, 0)) < 0.01 then 'CONFERIDO'
    when coalesce(d.ceia_faltante, 0) > 0 then 'FALTANDO'
    else 'EXCEDIDO'
  end as status_conferencia,
  d.notes,
  d.created_at,
  p.full_name as operator_name,
  b.name as booth_name,
  b.code as booth_code
from public.daily_cash_closings d
left join public.profiles p on p.user_id = d.user_id
left join public.booths b on b.id = d.office_id;

grant execute on function public.open_shift(uuid, text) to authenticated;
grant execute on function public.close_shift(uuid, text, text) to authenticated;
grant select on public.v_shift_totals to authenticated;
grant select on public.v_admin_cash_audit to authenticated;

alter table public.audit_logs enable row level security;
alter table public.shift_cash_closings enable row level security;
alter table public.user_attendance enable row level security;
alter table public.boarding_taxes enable row level security;
alter table public.operator_messages enable row level security;
alter table public.daily_cash_closings enable row level security;

drop policy if exists audit_self_or_admin_select on public.audit_logs;
create policy audit_self_or_admin_select on public.audit_logs
for select using (created_by = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists audit_insert_authenticated on public.audit_logs;
create policy audit_insert_authenticated on public.audit_logs
for insert with check (created_by = auth.uid());

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
      and s.status = 'open'
  )
);

drop policy if exists shift_cash_closings_self_update on public.shift_cash_closings;
create policy shift_cash_closings_self_update on public.shift_cash_closings
for update using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists shift_cash_closings_admin_update on public.shift_cash_closings;
create policy shift_cash_closings_admin_update on public.shift_cash_closings
for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

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

drop policy if exists boarding_taxes_select_active_or_admin on public.boarding_taxes;
create policy boarding_taxes_select_active_or_admin on public.boarding_taxes
for select using (active = true or public.can_read_admin_data(auth.uid()));

drop policy if exists boarding_taxes_admin_insert on public.boarding_taxes;
create policy boarding_taxes_admin_insert on public.boarding_taxes
for insert with check (public.is_admin(auth.uid()));

drop policy if exists boarding_taxes_admin_update on public.boarding_taxes;
create policy boarding_taxes_admin_update on public.boarding_taxes
for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

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

drop policy if exists daily_cash_closings_self_or_admin_select on public.daily_cash_closings;
create policy daily_cash_closings_self_or_admin_select on public.daily_cash_closings
for select using (user_id = auth.uid() or public.can_read_admin_data(auth.uid()));

drop policy if exists daily_cash_closings_self_insert on public.daily_cash_closings;
create policy daily_cash_closings_self_insert on public.daily_cash_closings
for insert with check (user_id = auth.uid());

drop policy if exists daily_cash_closings_self_update on public.daily_cash_closings;
create policy daily_cash_closings_self_update on public.daily_cash_closings
for update using (user_id = auth.uid() and status = 'open')
with check (user_id = auth.uid());

drop policy if exists daily_cash_closings_admin_update on public.daily_cash_closings;
create policy daily_cash_closings_admin_update on public.daily_cash_closings
for update using (public.can_read_admin_data(auth.uid()))
with check (public.can_read_admin_data(auth.uid()));

drop policy if exists daily_cash_closings_admin_delete on public.daily_cash_closings;
create policy daily_cash_closings_admin_delete on public.daily_cash_closings
for delete using (public.can_read_admin_data(auth.uid()));
