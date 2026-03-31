-- F1 - Base SaaS multi-tenant + RBAC (tenant_admin, operator, financeiro)
-- Idempotente e compatível com bases legadas.

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
alter table if exists public.clients add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.shifts add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.transactions add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.transaction_receipts add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.cash_movements add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.shift_cash_closings add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.transaction_categories add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.transaction_subcategories add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.adjustment_requests add column if not exists tenant_id uuid references public.tenants(id);
alter table if exists public.audit_logs add column if not exists tenant_id uuid references public.tenants(id);

update public.profiles set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.booths set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.operator_booths set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.companies set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.clients set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.shifts set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.transactions set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.transaction_receipts set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.cash_movements set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.shift_cash_closings set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.transaction_categories set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.transaction_subcategories set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.adjustment_requests set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;
update public.audit_logs set tenant_id = (select id from public.tenants where slug = 'default') where tenant_id is null;

create or replace function public.current_tenant_id()
returns uuid language sql stable as $$
  select p.tenant_id from public.profiles p where p.user_id = auth.uid();
$$;

create or replace function public.has_role(_roles text[])
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.active = true
    and (p.role::text = any(_roles) or (p.role::text = 'admin' and 'tenant_admin' = any(_roles)))
  );
$$;

create or replace function public.is_tenant_admin()
returns boolean language sql stable as $$ select public.has_role(array['tenant_admin']); $$;

create or replace function public.is_financeiro()
returns boolean language sql stable as $$ select public.has_role(array['financeiro']); $$;

create index if not exists idx_profiles_tenant on public.profiles(tenant_id);
create index if not exists idx_transactions_tenant on public.transactions(tenant_id);
create index if not exists idx_shifts_tenant on public.shifts(tenant_id);
create index if not exists idx_companies_tenant on public.companies(tenant_id);
create index if not exists idx_booths_tenant on public.booths(tenant_id);
