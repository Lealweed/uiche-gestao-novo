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

alter table public.boarding_taxes enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'boarding_taxes'
      and policyname = 'boarding_taxes_select_active_or_admin'
  ) then
    create policy boarding_taxes_select_active_or_admin on public.boarding_taxes
      for select
      to authenticated
      using (
        active = true
        or exists (
          select 1
          from public.profiles
          where profiles.user_id = auth.uid()
            and profiles.role in ('admin', 'tenant_admin')
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'boarding_taxes'
      and policyname = 'boarding_taxes_admin_insert'
  ) then
    create policy boarding_taxes_admin_insert on public.boarding_taxes
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.profiles
          where profiles.user_id = auth.uid()
            and profiles.role in ('admin', 'tenant_admin')
        )
      );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'boarding_taxes'
      and policyname = 'boarding_taxes_admin_update'
  ) then
    create policy boarding_taxes_admin_update on public.boarding_taxes
      for update
      to authenticated
      using (
        exists (
          select 1
          from public.profiles
          where profiles.user_id = auth.uid()
            and profiles.role in ('admin', 'tenant_admin')
        )
      )
      with check (
        exists (
          select 1
          from public.profiles
          where profiles.user_id = auth.uid()
            and profiles.role in ('admin', 'tenant_admin')
        )
      );
  end if;
end $$;
