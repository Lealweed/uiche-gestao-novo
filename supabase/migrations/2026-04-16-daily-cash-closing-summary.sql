-- Fechamento diário por resumo: total por empresa + meios de pagamento + CEIA

create extension if not exists pgcrypto;

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

create table if not exists public.daily_cash_closings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id),
  office_id uuid not null references public.booths(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  date date not null,
  company text not null,
  total_sold numeric(12,2) not null default 0 check (total_sold >= 0),
  amount_pix numeric(12,2) not null default 0 check (amount_pix >= 0),
  amount_card numeric(12,2) not null default 0 check (amount_card >= 0),
  amount_cash numeric(12,2) not null default 0 check (amount_cash >= 0),
  ceia_amount numeric(12,2) not null default 0 check (ceia_amount >= 0),
  cash_net numeric(12,2) generated always as (round((amount_cash - ceia_amount)::numeric, 2)) stored,
  status text not null default 'open' check (status in ('open', 'closed')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_cash_closings_payment_sum_check check (
    round((amount_pix + amount_card + amount_cash)::numeric, 2) = round(total_sold::numeric, 2)
  ),
  unique (office_id, user_id, date, company)
);

update public.daily_cash_closings
set tenant_id = (select id from public.tenants where slug = 'default')
where tenant_id is null;

create index if not exists daily_cash_closings_office_idx on public.daily_cash_closings(office_id, date desc);
create index if not exists daily_cash_closings_user_idx on public.daily_cash_closings(user_id, date desc);
create index if not exists daily_cash_closings_company_idx on public.daily_cash_closings(company);
create index if not exists daily_cash_closings_tenant_idx on public.daily_cash_closings(tenant_id);

alter table public.daily_cash_closings enable row level security;

drop policy if exists daily_cash_closings_self_or_admin_select on public.daily_cash_closings;
create policy daily_cash_closings_self_or_admin_select on public.daily_cash_closings
for select using (
  user_id = auth.uid() or public.can_read_admin_data(auth.uid())
);

drop policy if exists daily_cash_closings_self_insert on public.daily_cash_closings;
create policy daily_cash_closings_self_insert on public.daily_cash_closings
for insert with check (
  user_id = auth.uid()
);

do $$
begin
  if exists (
    select 1
    from pg_proc
    where proname = 'tg_set_updated_at'
  ) then
    execute 'drop trigger if exists daily_cash_closings_set_updated_at on public.daily_cash_closings';
    execute 'create trigger daily_cash_closings_set_updated_at before update on public.daily_cash_closings for each row execute function public.tg_set_updated_at()';
  end if;
end $$;
